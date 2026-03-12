import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Recreate the schema from src/app/api/admin/tenants/[id]/route.ts
// since it's not exported
const tenantPatchSchema = z.object({
  name: z.string().min(1).optional(),
  enabled_modules: z.array(z.string()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
}).strict();

describe('tenantPatchSchema', () => {
  describe('valid inputs', () => {
    it.each([
      [{ name: 'Foo' }, 'name only'],
      [{ enabled_modules: ['inventory'] }, 'enabled_modules only'],
      [{ settings: { key: 'val' } }, 'settings only'],
      [{}, 'empty object'],
      [{ name: 'Test', enabled_modules: ['inventory', 'dispatch'] }, 'combined fields'],
    ])('accepts %j (%s)', (input) => {
      const result = tenantPatchSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('rejects unknown field schema_name (.strict())', () => {
      const result = tenantPatchSchema.safeParse({ schema_name: 'evil' });
      expect(result.success).toBe(false);
    });

    it('rejects unknown field id', () => {
      const result = tenantPatchSchema.safeParse({ id: 'xxx' });
      expect(result.success).toBe(false);
    });

    it('rejects unknown field created_at', () => {
      const result = tenantPatchSchema.safeParse({ created_at: 'date' });
      expect(result.success).toBe(false);
    });

    it('rejects name with empty string (min 1)', () => {
      const result = tenantPatchSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('rejects enabled_modules with non-string items', () => {
      const result = tenantPatchSchema.safeParse({ enabled_modules: [123] });
      expect(result.success).toBe(false);
    });
  });
});
