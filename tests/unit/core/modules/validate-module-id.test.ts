import { describe, it, expect } from 'vitest';
import { validateModuleId } from '@/core/modules/validate-module-id';

describe('validateModuleId', () => {
  describe('valid kebab-case IDs', () => {
    it.each([
      'inventory',
      'lot-tracking',
      'user-management',
      'a',
      'a1',
      'abc-def-ghi',
    ])('accepts "%s"', (id) => {
      expect(() => validateModuleId(id)).not.toThrow();
    });
  });

  describe('invalid IDs', () => {
    it.each([
      ['user_management', 'underscore'],
      ['UserManagement', 'uppercase'],
      ['-leading-dash', 'leading dash'],
      ['trailing-', 'trailing dash'],
      ['double--dash', 'double dash'],
      ['', 'empty string'],
      ['123', 'starts with number'],
    ])('rejects "%s" (%s)', (id) => {
      expect(() => validateModuleId(id)).toThrow(/Invalid module ID/);
    });
  });
});
