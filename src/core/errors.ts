export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class PermissionError extends AppError {
  constructor(permission: string) {
    super(`Missing permission: ${permission}`, 403, 'PERMISSION_DENIED');
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, 404, 'NOT_FOUND');
  }
}

export class ModuleDisabledError extends AppError {
  constructor(moduleId: string) {
    super(`Module not enabled: ${moduleId}`, 403, 'MODULE_DISABLED');
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export function httpStatusFromError(error: unknown): number {
  if (error instanceof AppError) return error.statusCode;
  return 500;
}
