import { describe, it, expect, beforeAll } from 'vitest';
import { userRepository } from '@/server/repositories/userRepository';
import * as listService from '@/server/domain/list/listService';
import { ForbiddenError, NotFoundError, ConflictError } from '@/server/lib/errors';
import type { AuthUser } from '@/server/domain/shared/types';

function toAuthUser(u: { id: string; username: string; displayName: string; role: 'ADMIN' | 'FAMILY' | 'GUEST' }): AuthUser {
  return u;
}

describe('listService — sharing and permission scenarios (D1.3 / D1.1)', () => {
  let owner: AuthUser;
  let familyEditor: AuthUser;
  let guestViewer: AuthUser;
  let admin: AuthUser;
  let outsider: AuthUser;

  beforeAll(async () => {
    const s = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    owner = toAuthUser(await userRepository.create({ username: `owner-${s}`, passwordHash: 'x', displayName: 'Owner', role: 'FAMILY' }));
    familyEditor = toAuthUser(
      await userRepository.create({ username: `family-${s}`, passwordHash: 'x', displayName: 'Family', role: 'FAMILY' })
    );
    guestViewer = toAuthUser(
      await userRepository.create({ username: `guest-${s}`, passwordHash: 'x', displayName: 'Guest', role: 'GUEST' })
    );
    admin = toAuthUser(await userRepository.create({ username: `admin-${s}`, passwordHash: 'x', displayName: 'Admin', role: 'ADMIN' }));
    outsider = toAuthUser(
      await userRepository.create({ username: `outsider-${s}`, passwordHash: 'x', displayName: 'Outsider', role: 'FAMILY' })
    );
  });

  it('guest cannot create a list', async () => {
    await expect(listService.createList(guestViewer, 'ゲストの試み')).rejects.toThrow(ForbiddenError);
  });

  it('family creates a list and sees it with role OWNER', async () => {
    const list = await listService.createList(owner, 'テストリスト');
    expect(list.ownerId).toBe(owner.id);
    const lists = await listService.listListsForUser(owner);
    expect(lists.find((l) => l.id === list.id)?.role).toBe('OWNER');
  });

  it('an unrelated user gets 404 (not 403) for a list not shared with them', async () => {
    const list = await listService.createList(owner, '非公開リスト');
    await expect(listService.getListDetail(outsider, list.id)).rejects.toThrow(NotFoundError);
  });

  it('sharing grants the correct role, and a VIEW share cannot edit items', async () => {
    const list = await listService.createList(owner, '共有リスト');
    await listService.shareList(owner, list.id, familyEditor.id, 'EDIT');
    await listService.shareList(owner, list.id, guestViewer.id, 'VIEW');

    expect((await listService.getListDetail(familyEditor, list.id)).myPermission).toBe('EDIT');
    expect((await listService.getListDetail(guestViewer, list.id)).myPermission).toBe('VIEW');

    const item = await listService.addItem(familyEditor, list.id, { title: '牛乳' });
    await expect(listService.toggleItem(guestViewer, list.id, item.id)).rejects.toThrow(ForbiddenError);

    const toggled = await listService.toggleItem(familyEditor, list.id, item.id);
    expect(toggled.completed).toBe(true);
    expect(toggled.completedBy?.id).toBe(familyEditor.id);
  });

  it('sharing the same user twice throws ConflictError', async () => {
    const list = await listService.createList(owner, '重複共有テスト');
    await listService.shareList(owner, list.id, familyEditor.id, 'VIEW');
    await expect(listService.shareList(owner, list.id, familyEditor.id, 'EDIT')).rejects.toThrow(ConflictError);
  });

  it('only the owner or an admin can delete a list — a non-owner EDIT-share cannot', async () => {
    const list = await listService.createList(owner, '削除テスト');
    await listService.shareList(owner, list.id, familyEditor.id, 'EDIT');

    await expect(listService.deleteList(familyEditor, list.id)).rejects.toThrow(ForbiddenError);
    await listService.deleteList(admin, list.id);

    // deleted lists are gone even for the owner
    await expect(listService.getListDetail(owner, list.id)).rejects.toThrow(NotFoundError);
  });

  it('reordering rejects a set of ids that does not match the existing items exactly', async () => {
    const list = await listService.createList(owner, '並び替えテスト');
    const item1 = await listService.addItem(owner, list.id, { title: 'A' });
    await listService.addItem(owner, list.id, { title: 'B' });

    await expect(listService.reorderItems(owner, list.id, [item1.id])).rejects.toThrow();
  });

  describe('item details — tags, url, note', () => {
    it('creates an item with tags/url/note and returns them normalized', async () => {
      const list = await listService.createList(owner, '詳細テスト');
      const item = await listService.addItem(owner, list.id, {
        title: '牛乳',
        tags: ['買い物', '急ぎ'],
        url: 'example.com/milk',
        note: 'スーパーで買う',
      });

      expect(item.tags).toEqual(['買い物', '急ぎ']);
      expect(item.url).toBe('https://example.com/milk');
      expect(item.note).toBe('スーパーで買う');
    });

    it('creating an item without details defaults to empty tags and null url', async () => {
      const list = await listService.createList(owner, '詳細なしテスト');
      const item = await listService.addItem(owner, list.id, { title: 'パン' });

      expect(item.tags).toEqual([]);
      expect(item.url).toBeNull();
      expect(item.note).toBeNull();
    });

    it('rejects an invalid url with ValidationError', async () => {
      const list = await listService.createList(owner, '不正URLテスト');
      await expect(
        listService.addItem(owner, list.id, { title: '不正な項目', url: '   ' })
      ).resolves.toMatchObject({ url: null });

      await expect(
        listService.addItem(owner, list.id, { title: '不正な項目2', url: 'http://' })
      ).rejects.toThrow();
    });

    it('editItem can add tags/url/note to an already-created item', async () => {
      const list = await listService.createList(owner, '後から編集テスト');
      const item = await listService.addItem(owner, list.id, { title: '洗剤' });
      expect(item.tags).toEqual([]);

      const updated = await listService.editItem(owner, list.id, item.id, {
        tags: ['日用品'],
        url: 'https://example.com/detergent',
        note: '香りは無香料',
      });

      expect(updated.tags).toEqual(['日用品']);
      expect(updated.url).toBe('https://example.com/detergent');
      expect(updated.note).toBe('香りは無香料');
    });

    it('editItem without a details field leaves it unchanged', async () => {
      const list = await listService.createList(owner, '部分更新テスト');
      const item = await listService.addItem(owner, list.id, {
        title: 'タオル',
        tags: ['お風呂'],
        url: 'https://example.com/towel',
      });

      const updated = await listService.editItem(owner, list.id, item.id, { title: 'タオル(更新)' });

      expect(updated.title).toBe('タオル(更新)');
      expect(updated.tags).toEqual(['お風呂']);
      expect(updated.url).toBe('https://example.com/towel');
    });
  });
});
