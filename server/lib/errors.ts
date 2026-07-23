export abstract class AppError extends Error {
  abstract readonly httpStatus: number;
  abstract readonly code: string;
}

export class ValidationError extends AppError {
  readonly httpStatus = 400;
  readonly code = 'VALIDATION_ERROR';
}

export class UnauthorizedError extends AppError {
  readonly httpStatus = 401;
  readonly code = 'UNAUTHORIZED';
}

export class ForbiddenError extends AppError {
  readonly httpStatus = 403;
  readonly code = 'FORBIDDEN';
}

export class NotFoundError extends AppError {
  readonly httpStatus = 404;
  readonly code = 'NOT_FOUND';
}

export class ConflictError extends AppError {
  readonly httpStatus = 409;
  readonly code: string;

  constructor(message: string, code = 'CONFLICT') {
    super(message);
    this.code = code;
  }
}

export class ExternalServiceError extends AppError {
  readonly httpStatus = 502;
  readonly code = 'EXTERNAL_SERVICE_ERROR';
}
