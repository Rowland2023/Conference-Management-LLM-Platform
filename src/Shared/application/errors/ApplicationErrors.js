// src/shared/application/errors/ApplicationErrors.js

/**
 * Base class for all application-layer errors.
 * These are intended to be translated by the global HTTP
 * error handler into appropriate HTTP responses.
 */
export class ApplicationError extends Error {
  constructor(message, statusCode = 500, code = 'APPLICATION_ERROR') {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;

    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * 400 Bad Request
 */
export class ValidationError extends ApplicationError {
  constructor(message = 'Validation failed.') {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

/**
 * 401 Unauthorized
 */
export class UnauthorizedError extends ApplicationError {
  constructor(message = 'Authentication required.') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * 403 Forbidden
 */
export class ForbiddenError extends ApplicationError {
  constructor(message = 'Access denied.') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * 404 Not Found
 */
export class NotFoundError extends ApplicationError {
  constructor(message = 'Resource not found.') {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * 409 Conflict
 */
export class ConflictError extends ApplicationError {
  constructor(message = 'Resource conflict.') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Optimistic Concurrency Control conflict
 */
export class ConcurrencyConflictError extends ConflictError {
  constructor(
    message = 'The resource was modified by another process. Please reload and try again.'
  ) {
    super(message);

    this.code = 'CONCURRENCY_CONFLICT';
  }
}

/**
 * 422 Unprocessable Entity
 */
export class BusinessRuleViolationError extends ApplicationError {
  constructor(message = 'Business rule violated.') {
    super(message, 422, 'BUSINESS_RULE_VIOLATION');
  }
}

/**
 * 503 Service Unavailable
 */
export class InfrastructureError extends ApplicationError {
  constructor(message = 'Infrastructure failure.') {
    super(message, 503, 'INFRASTRUCTURE_ERROR');
  }
}