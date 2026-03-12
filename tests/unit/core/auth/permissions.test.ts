import { describe, it, expect } from 'vitest';
import { ALL_PERMISSIONS, getAdminPermissions } from '@/core/auth/permissions';

describe('permissions', () => {
  it('ALL_PERMISSIONS contains all 18 permission keys', () => {
    expect(ALL_PERMISSIONS).toHaveLength(18);
  });

  it('admin permissions gives all true', () => {
    const perms = getAdminPermissions();
    for (const p of ALL_PERMISSIONS) {
      expect(perms[p]).toBe(true);
    }
  });
});
