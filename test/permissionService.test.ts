import { describe, it, expect } from 'vitest';
import { can, hasListViewAccess, getListRole } from '@/server/domain/permission/permissionService';
import type { AuthUser } from '@/server/domain/shared/types';
import type { ListResourceContext } from '@/server/domain/permission/actions';

function user(role: AuthUser['role'], id = `user-${role}`): AuthUser {
  return { id, username: id, displayName: id, role };
}

const admin = user('ADMIN');
const family = user('FAMILY');
const guest = user('GUEST');

describe('permissionService.can — role matrix (D1.3)', () => {
  it('aircon.view is allowed for every role', () => {
    expect(can(admin, 'aircon.view')).toBe(true);
    expect(can(family, 'aircon.view')).toBe(true);
    expect(can(guest, 'aircon.view')).toBe(true);
  });

  it('aircon.operate is allowed only for admin and family', () => {
    expect(can(admin, 'aircon.operate')).toBe(true);
    expect(can(family, 'aircon.operate')).toBe(true);
    expect(can(guest, 'aircon.operate')).toBe(false);
  });

  it('sensor.view is allowed for every role', () => {
    expect(can(admin, 'sensor.view')).toBe(true);
    expect(can(family, 'sensor.view')).toBe(true);
    expect(can(guest, 'sensor.view')).toBe(true);
  });

  it('list.create is allowed only for admin and family', () => {
    expect(can(admin, 'list.create')).toBe(true);
    expect(can(family, 'list.create')).toBe(true);
    expect(can(guest, 'list.create')).toBe(false);
  });

  it('user.manage and auditlog.view are admin-only', () => {
    for (const action of ['user.manage', 'auditlog.view'] as const) {
      expect(can(admin, action)).toBe(true);
      expect(can(family, action)).toBe(false);
      expect(can(guest, action)).toBe(false);
    }
  });

  describe('list.rename / list.delete / list.share.manage — owner or admin only', () => {
    const owner = user('FAMILY', 'owner-1');
    const ctx: ListResourceContext = { ownerId: owner.id, shares: [{ userId: family.id, permission: 'EDIT' }] };

    it('owner can manage their own list', () => {
      expect(can(owner, 'list.delete', { list: ctx })).toBe(true);
      expect(can(owner, 'list.rename', { list: ctx })).toBe(true);
      expect(can(owner, 'list.share.manage', { list: ctx })).toBe(true);
    });

    it('admin can manage any list even without being owner or shared', () => {
      expect(can(admin, 'list.delete', { list: ctx })).toBe(true);
    });

    it('a user with only an EDIT share cannot delete/rename/manage shares', () => {
      expect(can(family, 'list.delete', { list: ctx })).toBe(false);
      expect(can(family, 'list.rename', { list: ctx })).toBe(false);
      expect(can(family, 'list.share.manage', { list: ctx })).toBe(false);
    });

    it('an unrelated user cannot manage the list', () => {
      expect(can(guest, 'list.delete', { list: ctx })).toBe(false);
    });
  });

  describe('list.item.* — owner/admin/EDIT-share can edit, VIEW-share cannot', () => {
    const owner = user('FAMILY', 'owner-2');
    const editor = user('FAMILY', 'editor-1');
    const viewer = user('GUEST', 'viewer-1');
    const ctx: ListResourceContext = {
      ownerId: owner.id,
      shares: [
        { userId: editor.id, permission: 'EDIT' },
        { userId: viewer.id, permission: 'VIEW' },
      ],
    };

    it('owner, admin, and EDIT-share users can edit items', () => {
      for (const action of ['list.item.create', 'list.item.edit', 'list.item.toggle', 'list.item.delete', 'list.item.reorder'] as const) {
        expect(can(owner, action, { list: ctx })).toBe(true);
        expect(can(admin, action, { list: ctx })).toBe(true);
        expect(can(editor, action, { list: ctx })).toBe(true);
      }
    });

    it('VIEW-share users cannot edit items', () => {
      for (const action of ['list.item.create', 'list.item.edit', 'list.item.toggle', 'list.item.delete', 'list.item.reorder'] as const) {
        expect(can(viewer, action, { list: ctx })).toBe(false);
      }
    });

    it('users with no relation to the list cannot edit items', () => {
      expect(can(guest, 'list.item.create', { list: ctx })).toBe(false);
    });
  });
});

describe('hasListViewAccess — used to decide 404-vs-normal-flow (D1.1)', () => {
  const owner = user('FAMILY', 'owner-3');
  const viewer = user('GUEST', 'viewer-2');
  const ctx: ListResourceContext = { ownerId: owner.id, shares: [{ userId: viewer.id, permission: 'VIEW' }] };

  it('owner, admin, and any shared user (VIEW or EDIT) have view access', () => {
    expect(hasListViewAccess(owner, ctx)).toBe(true);
    expect(hasListViewAccess(admin, ctx)).toBe(true);
    expect(hasListViewAccess(viewer, ctx)).toBe(true);
  });

  it('an unrelated user has no view access', () => {
    expect(hasListViewAccess(guest, ctx)).toBe(false);
  });
});

describe('getListRole — role badge shown in the list index UI', () => {
  const owner = user('FAMILY', 'owner-4');
  const editor = user('FAMILY', 'editor-2');
  const viewer = user('GUEST', 'viewer-3');
  const ctx: ListResourceContext = {
    ownerId: owner.id,
    shares: [
      { userId: editor.id, permission: 'EDIT' },
      { userId: viewer.id, permission: 'VIEW' },
    ],
  };

  it('reflects true ownership/share relationship, not admin override power', () => {
    expect(getListRole(owner, ctx)).toBe('OWNER');
    expect(getListRole(editor, ctx)).toBe('EDIT');
    expect(getListRole(viewer, ctx)).toBe('VIEW');
    expect(getListRole(guest, ctx)).toBeNull();
    // admin has management power via can(), but getListRole reports their actual relation (none) here
    expect(getListRole(admin, ctx)).toBeNull();
  });
});
