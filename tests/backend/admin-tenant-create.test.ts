import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Copy of the schema to unit-test in isolation
const createTenantSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  plan: z.enum(['free', 'starter', 'pro', 'enterprise']).optional(),
  enabledModules: z.array(z.string()).optional(),
  ownerEmail: z.string().email().optional(),
});

describe('createTenantSchema', () => {
  it('accepts valid input without ownerEmail', () => {
    const result = createTenantSchema.safeParse({ name: 'Acme', slug: 'acme' });
    expect(result.success).toBe(true);
  });

  it('accepts valid input with ownerEmail', () => {
    const result = createTenantSchema.safeParse({
      name: 'Acme',
      slug: 'acme',
      ownerEmail: 'owner@example.com',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.ownerEmail).toBe('owner@example.com');
  });

  it('rejects invalid email', () => {
    const result = createTenantSchema.safeParse({
      name: 'Acme',
      slug: 'acme',
      ownerEmail: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('treats missing ownerEmail as undefined (not required)', () => {
    const result = createTenantSchema.safeParse({ name: 'Acme', slug: 'acme' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.ownerEmail).toBeUndefined();
  });

  it('rejects slug with uppercase or spaces', () => {
    expect(createTenantSchema.safeParse({ name: 'Acme', slug: 'Has Spaces' }).success).toBe(false);
    expect(createTenantSchema.safeParse({ name: 'Acme', slug: 'ACME' }).success).toBe(false);
    expect(createTenantSchema.safeParse({ name: 'Acme', slug: 'valid-slug' }).success).toBe(true);
  });
});
