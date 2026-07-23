import type { SharePermission } from '@prisma/client';
import { listRepository, type ListWithRelations } from '@/server/repositories/listRepository';
import { listItemRepository, type ListItemWithRelations } from '@/server/repositories/listItemRepository';
import { listShareRepository } from '@/server/repositories/listShareRepository';
import { userRepository } from '@/server/repositories/userRepository';
import { assertCan, hasListViewAccess, getListRole } from '@/server/domain/permission/permissionService';
import type { ListResourceContext } from '@/server/domain/permission/actions';
import * as auditLogService from '@/server/domain/auditLog/auditLogService';
import { NotFoundError, ValidationError, ConflictError } from '@/server/lib/errors';
import type { AuthUser } from '@/server/domain/shared/types';

export interface ListDto {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  itemCount: number;
  completedCount: number;
  updatedAt: Date;
}

export interface ListSummaryDto extends ListDto {
  role: 'OWNER' | 'EDIT' | 'VIEW';
}

export interface ListItemDto {
  id: string;
  title: string;
  note: string | null;
  completed: boolean;
  sortOrder: number;
  createdBy: { id: string; displayName: string };
  completedBy: { id: string; displayName: string } | null;
}

export interface ListShareDto {
  id: string;
  user: { id: string; displayName: string };
  permission: SharePermission;
}

export interface ListDetailDto {
  id: string;
  name: string;
  ownerId: string;
  myPermission: 'OWNER' | 'EDIT' | 'VIEW';
  items: ListItemDto[];
  shares: ListShareDto[];
}

function toResourceContext(list: {
  ownerId: string;
  shares: { userId: string; permission: SharePermission }[];
}): ListResourceContext {
  return { ownerId: list.ownerId, shares: list.shares.map((s) => ({ userId: s.userId, permission: s.permission })) };
}

async function getListOrThrow(listId: string): Promise<ListWithRelations> {
  const list = await listRepository.findById(listId);
  if (!list) throw new NotFoundError('リストが見つかりません');
  return list;
}

function assertViewAccessOrNotFound(user: AuthUser, ctx: ListResourceContext): void {
  if (!hasListViewAccess(user, ctx)) {
    throw new NotFoundError('リストが見つかりません');
  }
}

function toItemDto(item: ListItemWithRelations): ListItemDto {
  return {
    id: item.id,
    title: item.title,
    note: item.note,
    completed: item.completed,
    sortOrder: item.sortOrder,
    createdBy: { id: item.createdBy.id, displayName: item.createdBy.displayName },
    completedBy: item.completedBy ? { id: item.completedBy.id, displayName: item.completedBy.displayName } : null,
  };
}

async function toListDto(list: { id: string; name: string; ownerId: string; updatedAt: Date }, ownerName: string): Promise<ListDto> {
  const items = await listItemRepository.findByListId(list.id);
  return {
    id: list.id,
    name: list.name,
    ownerId: list.ownerId,
    ownerName,
    itemCount: items.length,
    completedCount: items.filter((i) => i.completed).length,
    updatedAt: list.updatedAt,
  };
}

export async function createList(user: AuthUser, name: string): Promise<ListDto> {
  assertCan(user, 'list.create');
  const trimmed = name.trim();
  if (!trimmed) throw new ValidationError('リスト名を入力してください');

  const list = await listRepository.create(user.id, trimmed);
  await auditLogService.record({
    userId: user.id,
    action: 'LIST_CREATE',
    targetType: 'List',
    targetId: list.id,
    detail: { name: trimmed },
  });

  return toListDto(list, user.displayName);
}

export async function renameList(user: AuthUser, listId: string, name: string): Promise<ListDto> {
  const list = await getListOrThrow(listId);
  const ctx = toResourceContext(list);
  assertViewAccessOrNotFound(user, ctx);
  assertCan(user, 'list.rename', { list: ctx });

  const trimmed = name.trim();
  if (!trimmed) throw new ValidationError('リスト名を入力してください');

  const updated = await listRepository.rename(listId, trimmed);
  await auditLogService.record({
    userId: user.id,
    action: 'LIST_RENAME',
    targetType: 'List',
    targetId: listId,
    detail: { name: trimmed },
  });

  return toListDto(updated, list.owner.displayName);
}

export async function deleteList(user: AuthUser, listId: string): Promise<void> {
  const list = await getListOrThrow(listId);
  const ctx = toResourceContext(list);
  assertViewAccessOrNotFound(user, ctx);
  assertCan(user, 'list.delete', { list: ctx });

  await listRepository.delete(listId);
  await auditLogService.record({
    userId: user.id,
    action: 'LIST_DELETE',
    targetType: 'List',
    targetId: listId,
    detail: { name: list.name },
  });
}

export async function listListsForUser(user: AuthUser): Promise<ListSummaryDto[]> {
  const lists = await listRepository.findAccessibleByUser(user.id);
  return lists.map((list) => {
    const ctx = toResourceContext(list);
    const role = getListRole(user, ctx) ?? (user.role === 'ADMIN' ? 'EDIT' : 'VIEW');
    return {
      id: list.id,
      name: list.name,
      ownerId: list.ownerId,
      ownerName: list.owner.displayName,
      itemCount: list.items.length,
      completedCount: list.items.filter((i) => i.completed).length,
      updatedAt: list.updatedAt,
      role,
    };
  });
}

export async function getListDetail(user: AuthUser, listId: string): Promise<ListDetailDto> {
  const list = await getListOrThrow(listId);
  const ctx = toResourceContext(list);
  assertViewAccessOrNotFound(user, ctx);

  const items = await listItemRepository.findByListId(listId);
  const role = getListRole(user, ctx) ?? (user.role === 'ADMIN' ? 'EDIT' : 'VIEW');

  return {
    id: list.id,
    name: list.name,
    ownerId: list.ownerId,
    myPermission: role,
    items: items.map(toItemDto),
    shares: list.shares.map((s) => ({ id: s.id, user: { id: s.user.id, displayName: s.user.displayName }, permission: s.permission })),
  };
}

export async function getItems(user: AuthUser, listId: string): Promise<ListItemDto[]> {
  const detail = await getListDetail(user, listId);
  return detail.items;
}

export async function addItem(
  user: AuthUser,
  listId: string,
  input: { title: string; note?: string }
): Promise<ListItemDto> {
  const list = await getListOrThrow(listId);
  const ctx = toResourceContext(list);
  assertViewAccessOrNotFound(user, ctx);
  assertCan(user, 'list.item.create', { list: ctx });

  const title = input.title.trim();
  if (!title) throw new ValidationError('項目名を入力してください');

  const sortOrder = await listItemRepository.countByListId(listId);
  const item = await listItemRepository.create(listId, {
    title,
    note: input.note?.trim() || undefined,
    createdById: user.id,
    sortOrder,
  });

  await auditLogService.record({
    userId: user.id,
    action: 'LIST_ITEM_CREATE',
    targetType: 'ListItem',
    targetId: item.id,
    detail: { listId, title },
  });

  return toItemDto(item);
}

async function getOwnItemOrThrow(listId: string, itemId: string): Promise<ListItemWithRelations> {
  const item = await listItemRepository.findById(itemId);
  if (!item || item.listId !== listId) throw new NotFoundError('項目が見つかりません');
  return item;
}

export async function editItem(
  user: AuthUser,
  listId: string,
  itemId: string,
  input: { title?: string; note?: string }
): Promise<ListItemDto> {
  const list = await getListOrThrow(listId);
  const ctx = toResourceContext(list);
  assertViewAccessOrNotFound(user, ctx);
  assertCan(user, 'list.item.edit', { list: ctx });
  await getOwnItemOrThrow(listId, itemId);

  const data: Partial<{ title: string; note: string | null }> = {};
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) throw new ValidationError('項目名を入力してください');
    data.title = title;
  }
  if (input.note !== undefined) {
    data.note = input.note.trim() || null;
  }

  const updated = await listItemRepository.update(itemId, data);
  await auditLogService.record({
    userId: user.id,
    action: 'LIST_ITEM_UPDATE',
    targetType: 'ListItem',
    targetId: itemId,
    detail: data,
  });

  return toItemDto(updated);
}

export async function toggleItem(user: AuthUser, listId: string, itemId: string): Promise<ListItemDto> {
  const list = await getListOrThrow(listId);
  const ctx = toResourceContext(list);
  assertViewAccessOrNotFound(user, ctx);
  assertCan(user, 'list.item.toggle', { list: ctx });
  const existing = await getOwnItemOrThrow(listId, itemId);

  const updated = await listItemRepository.toggle(itemId, !existing.completed, user.id);
  await auditLogService.record({
    userId: user.id,
    action: 'LIST_ITEM_TOGGLE',
    targetType: 'ListItem',
    targetId: itemId,
    detail: { completed: updated.completed },
  });

  return toItemDto(updated);
}

export async function deleteItem(user: AuthUser, listId: string, itemId: string): Promise<void> {
  const list = await getListOrThrow(listId);
  const ctx = toResourceContext(list);
  assertViewAccessOrNotFound(user, ctx);
  assertCan(user, 'list.item.delete', { list: ctx });
  await getOwnItemOrThrow(listId, itemId);

  await listItemRepository.delete(itemId);
  await auditLogService.record({
    userId: user.id,
    action: 'LIST_ITEM_DELETE',
    targetType: 'ListItem',
    targetId: itemId,
    detail: { listId },
  });
}

export async function reorderItems(user: AuthUser, listId: string, orderedItemIds: string[]): Promise<void> {
  const list = await getListOrThrow(listId);
  const ctx = toResourceContext(list);
  assertViewAccessOrNotFound(user, ctx);
  assertCan(user, 'list.item.reorder', { list: ctx });

  const existingItems = await listItemRepository.findByListId(listId);
  const existingIds = new Set(existingItems.map((i) => i.id));
  const validIds = orderedItemIds.filter((id) => existingIds.has(id));
  if (validIds.length !== existingItems.length || validIds.length !== orderedItemIds.length) {
    throw new ValidationError('並び替え対象の項目が一致しません');
  }

  await listItemRepository.reorder(validIds);
}

export async function shareList(
  user: AuthUser,
  listId: string,
  targetUserId: string,
  permission: SharePermission
): Promise<ListShareDto> {
  const list = await getListOrThrow(listId);
  const ctx = toResourceContext(list);
  assertViewAccessOrNotFound(user, ctx);
  assertCan(user, 'list.share.manage', { list: ctx });

  if (targetUserId === list.ownerId) {
    throw new ValidationError('リスト作成者を共有先に追加することはできません');
  }

  const targetUser = await userRepository.findById(targetUserId);
  if (!targetUser) throw new ValidationError('指定したユーザーが見つかりません');

  const existingShare = await listShareRepository.findByListAndUser(listId, targetUserId);
  if (existingShare) throw new ConflictError('既にこのユーザーと共有されています');

  const share = await listShareRepository.create(listId, targetUserId, permission);
  await auditLogService.record({
    userId: user.id,
    action: 'LIST_SHARE_ADD',
    targetType: 'List',
    targetId: listId,
    detail: { targetUserId, permission },
  });

  return { id: share.id, user: { id: share.user.id, displayName: share.user.displayName }, permission: share.permission };
}

async function getOwnShareOrThrow(listId: string, shareId: string) {
  const share = await listShareRepository.findById(shareId);
  if (!share || share.listId !== listId) throw new NotFoundError('共有設定が見つかりません');
  return share;
}

export async function updateShare(
  user: AuthUser,
  listId: string,
  shareId: string,
  permission: SharePermission
): Promise<ListShareDto> {
  const list = await getListOrThrow(listId);
  const ctx = toResourceContext(list);
  assertViewAccessOrNotFound(user, ctx);
  assertCan(user, 'list.share.manage', { list: ctx });
  await getOwnShareOrThrow(listId, shareId);

  const updated = await listShareRepository.update(shareId, permission);
  await auditLogService.record({
    userId: user.id,
    action: 'LIST_SHARE_UPDATE',
    targetType: 'List',
    targetId: listId,
    detail: { shareId, permission },
  });

  return { id: updated.id, user: { id: updated.user.id, displayName: updated.user.displayName }, permission: updated.permission };
}

export async function removeShare(user: AuthUser, listId: string, shareId: string): Promise<void> {
  const list = await getListOrThrow(listId);
  const ctx = toResourceContext(list);
  assertViewAccessOrNotFound(user, ctx);
  assertCan(user, 'list.share.manage', { list: ctx });
  await getOwnShareOrThrow(listId, shareId);

  await listShareRepository.delete(shareId);
  await auditLogService.record({
    userId: user.id,
    action: 'LIST_SHARE_REMOVE',
    targetType: 'List',
    targetId: listId,
    detail: { shareId },
  });
}
