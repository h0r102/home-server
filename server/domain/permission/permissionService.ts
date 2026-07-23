import { ForbiddenError } from '@/server/lib/errors';
import type { AuthUser } from '@/server/domain/shared/types';
import type { Action, ListResourceContext } from './actions';

function isListOwnerOrAdmin(user: AuthUser, list: ListResourceContext): boolean {
  return user.role === 'ADMIN' || list.ownerId === user.id;
}

function hasListEditAccess(user: AuthUser, list: ListResourceContext): boolean {
  if (isListOwnerOrAdmin(user, list)) return true;
  return list.shares.some((share) => share.userId === user.id && share.permission === 'EDIT');
}

/**
 * 「アクセス権のない他人のリストIDを推測されても403ではなく404を返し、存在を秘匿する」(D1.1)
 * ための閲覧可否判定。ForbiddenErrorではなくNotFoundErrorへのマッピングは呼び出し元(listService)が行う。
 */
export function hasListViewAccess(user: AuthUser, list: ListResourceContext): boolean {
  if (isListOwnerOrAdmin(user, list)) return true;
  return list.shares.some((share) => share.userId === user.id);
}

export function getListRole(user: AuthUser, list: ListResourceContext): 'OWNER' | 'EDIT' | 'VIEW' | null {
  if (list.ownerId === user.id) return 'OWNER';
  const share = list.shares.find((s) => s.userId === user.id);
  return share ? share.permission : null;
}

export function can(user: AuthUser, action: Action, ctx?: { list?: ListResourceContext }): boolean {
  switch (action) {
    case 'aircon.view':
    case 'sensor.view':
      return true;

    case 'aircon.operate':
      return user.role === 'ADMIN' || user.role === 'FAMILY';

    case 'list.create':
      return user.role === 'ADMIN' || user.role === 'FAMILY';

    case 'list.rename':
    case 'list.delete':
    case 'list.share.manage':
      return ctx?.list ? isListOwnerOrAdmin(user, ctx.list) : user.role === 'ADMIN';

    case 'list.item.create':
    case 'list.item.edit':
    case 'list.item.toggle':
    case 'list.item.delete':
    case 'list.item.reorder':
      return ctx?.list ? hasListEditAccess(user, ctx.list) : false;

    case 'user.manage':
    case 'auditlog.view':
      return user.role === 'ADMIN';

    default:
      return false;
  }
}

export function assertCan(user: AuthUser, action: Action, ctx?: { list?: ListResourceContext }): void {
  if (!can(user, action, ctx)) {
    throw new ForbiddenError('この操作を行う権限がありません');
  }
}
