import { describe, it, expect } from 'vitest';
import { handleApiError } from '@/core/api/error-handler';
import { PermissionError, NotFoundError, ValidationError } from '@/core/errors';

describe('handleApiError', () => {
  it('returns 403 for PermissionError', async () => {
    const res = handleApiError(new PermissionError('canDispatch'));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('canDispatch');
  });

  it('returns 404 for NotFoundError', async () => {
    const res = handleApiError(new NotFoundError('dispatch', 'x'));
    expect(res.status).toBe(404);
  });

  it('returns 400 for ValidationError', async () => {
    const res = handleApiError(new ValidationError('bad input'));
    expect(res.status).toBe(400);
  });

  it('returns 500 for unknown errors', async () => {
    const res = handleApiError(new Error('kaboom'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal server error');
  });
});
