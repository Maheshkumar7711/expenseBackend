export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
    public readonly isOperational = true,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, code = 'BAD_REQUEST', details?: unknown) {
    super(400, code, message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED') {
    super(401, code, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(404, 'NOT_FOUND', `${resource} not found`, id ? { id } : undefined);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = 'CONFLICT', details?: unknown) {
    super(409, code, message, details);
  }
}

export interface ValidationDetail {
  field: string;
  message: string;
}

export class ValidationError extends AppError {
  constructor(details: ValidationDetail[], message = 'Request validation failed') {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterSeconds: number, message = 'Too many requests') {
    super(429, 'RATE_LIMIT_EXCEEDED', message, { retryAfterSeconds });
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'An unexpected error occurred') {
    super(500, 'INTERNAL_ERROR', message, undefined, false);
  }
}
