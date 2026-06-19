import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { AppError, ValidationError, type ValidationDetail } from '../errors';

interface ValidateSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

function zodToValidationDetails(error: unknown): ValidationDetail[] {
  if (
    error &&
    typeof error === 'object' &&
    'issues' in error &&
    Array.isArray((error as { issues: unknown }).issues)
  ) {
    return (error as { issues: Array<{ path: Array<string | number>; message: string }> }).issues.map(
      (issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      }),
    );
  }

  return [{ field: 'body', message: 'Invalid request' }];
}

export function validate(schemas: ValidateSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const validated: NonNullable<Request['validated']> = {};

      if (schemas.body) {
        validated.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        validated.query = schemas.query.parse(req.query);
      }
      if (schemas.params) {
        validated.params = schemas.params.parse(req.params);
      }

      req.validated = validated;
      next();
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
        return;
      }
      next(new ValidationError(zodToValidationDetails(error)));
    }
  };
}
