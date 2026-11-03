// src/shared/domain/error/DomainErrors.js

export class DomainError extends Error {
  constructor(message, { code = "DOMAIN_ERROR", statusCode = 500, cause } = {}) {
    super(message, { cause });

    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
    };
  }
}

export class DomainValidationError extends DomainError {
  constructor(message, code = "VALIDATION_FAILED", cause) {
    super(message, {
      code,
      statusCode: 422,
      cause,
    });
  }
}

/**
 * Domain invariant violation
 * Aggregate rules violated
 */
export class DomainInvariantError extends DomainValidationError {
  constructor(message, cause) {
    super(message, "DOMAIN_INVARIANT_VIOLATION", cause);
  }
}

export class BusinessRuleValidationError extends DomainError {
  constructor(message, code = "BUSINESS_RULE_VIOLATION", cause) {
    super(message, {
      code,
      statusCode: 400,
      cause,
    });
  }
}

export class EventDeserializationError extends DomainError {
  constructor(message, cause) {
    super(message, {
      code: "EVENT_DESERIALIZATION_ERROR",
      statusCode: 400,
      cause,
    });
  }
}

export class NotFoundError extends DomainError {
  constructor(message, code = "NOT_FOUND", cause) {
    super(message, {
      code,
      statusCode: 404,
      cause,
    });
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message, code = "UNAUTHORIZED", cause) {
    super(message, {
      code,
      statusCode: 403,
      cause,
    });
  }
}

export class ConcurrencyConflictError extends DomainError {
  constructor(message, code = "CONCURRENCY_CONFLICT", cause) {
    super(message, {
      code,
      statusCode: 409,
      cause,
    });
  }
}