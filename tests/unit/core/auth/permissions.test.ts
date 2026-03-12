import { describe, it, expect } from 'vitest';
import { ALL_PERMISSIONS, DEFAULT_PERMISSIONS, getAdminPermissions } from '@/core/auth/permissions';

describe('permissions', () => {
  it('ALL_PERMISSIONS contains all 18 permission keys', () => {
    expect(ALL_PERMISSIONS).toHaveLength(18);
  });

  it('DEFAULT_PERMISSIONS has an entry for every permission', () => {
    for (const p of ALL_PERMISSIONS) {
      expect(DEFAULT_PERMISSIONS).toHaveProperty(p);
    }
  });

  it('DEFAULT_PERMISSIONS values are all booleans', () => {
    for (const val of Object.values(DEFAULT_PERMISSIONS)) {
      expect(typeof val).toBe('boolean');
    }
  });

  it('DEFAULT_PERMISSIONS values are all false', () => {
    for (const val of Object.values(DEFAULT_PERMISSIONS)) {
      expect(val).toBe(false);
    }
  });

  it('admin permissions gives all true', () => {
    const perms = getAdminPermissions();
    for (const p of ALL_PERMISSIONS) {
      expect(perms[p]).toBe(true);
    }
  });
});
