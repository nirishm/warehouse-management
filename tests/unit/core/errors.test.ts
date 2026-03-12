import { describe, it, expect } from 'vitest';
import {
  AppError, PermissionError, NotFoundError,
  ModuleDisabledError, ValidationError, httpStatusFromError,
} from '@/core/errors';

describe('AppError hierarchy', () => {
  it('PermissionError has status 403', () => {
    const err = new PermissionError('canDispatch');
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
    expect(err.message).toContain('canDispatch');
  });

  it('NotFoundError has status 404', () => {
    const err = new NotFoundError('dispatch', 'abc-123');
    expect(err.statusCode).toBe(404);
  });

  it('ModuleDisabledError has status 403', () => {
    const err = new ModuleDisabledError('returns');
    expect(err.statusCode).toBe(403);
  });

  it('ValidationError has status 400', () => {
    const err = new ValidationError('quantity must be positive');
    expect(err.statusCode).toBe(400);
  });

  it('httpStatusFromError returns correct status for AppError', () => {
    expect(httpStatusFromError(new PermissionError('x'))).toBe(403);
  });

  it('httpStatusFromError returns 500 for unknown errors', () => {
    expect(httpStatusFromError(new Error('random'))).toBe(500);
  });
});
