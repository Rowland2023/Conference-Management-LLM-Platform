
import { ValidationError, InternalError } from '../errors/PaymentErrors.js';

const VALID_STATUSES = new Set([
  'PENDING',
  'GATEWAY_INITIALIZED',
  'SUCCESSFUL',
  'HELD',
  'RELEASED',
  'FAILED',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
  'CANCELED',
]);

const TRANSITION_MAP = Object.freeze({
  PENDING: Object.freeze([
    'GATEWAY_INITIALIZED',
    'FAILED',
    'CANCELED',
  ]),
  GATEWAY_INITIALIZED: Object.freeze([
    'SUCCESSFUL',
    'FAILED',
    'CANCELED',
  ]),
  SUCCESSFUL: Object.freeze([
    'HELD',
    'RELEASED',
    'PARTIALLY_REFUNDED',
    'REFUNDED',
  ]),
  HELD: Object.freeze([
    'RELEASED',
    'PARTIALLY_REFUNDED',
    'REFUNDED',
    'CANCELED',
  ]),
  PARTIALLY_REFUNDED: Object.freeze([
    'REFUNDED',
    'RELEASED',
  ]),
  RELEASED: Object.freeze([]),
  FAILED: Object.freeze([]),
  REFUNDED: Object.freeze([]),
  CANCELED: Object.freeze([]),
});

export class PaymentStatus {
  static PENDING = 'PENDING';
  static GATEWAY_INITIALIZED = 'GATEWAY_INITIALIZED';
  static SUCCESSFUL = 'SUCCESSFUL';
  static HELD = 'HELD';
  static RELEASED = 'RELEASED';
  static FAILED = 'FAILED';
  static PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED';
  static REFUNDED = 'REFUNDED';
  static CANCELED = 'CANCELED';

  constructor(value) {
    if (!value || typeof value !== 'string') {
      throw new ValidationError('PaymentStatus must be a non-empty string');
    }

    const upperValue = value.toUpperCase();

    if (!VALID_STATUSES.has(upperValue)) {
      throw new ValidationError(`Invalid payment status: '${value}'`);
    }

    this._value = upperValue;
    Object.freeze(this);
  }

  static fromDb(value) {
    try {
      return new PaymentStatus(value);
    } catch (error) {
      throw new InternalError(
        `Corrupt payment status in database: ${value}`,
        { cause: error },
      );
    }
  }

  get value() {
    return this._value;
  }

  isTransitionAllowedTo(nextStatus) {
    const targetValue = nextStatus instanceof PaymentStatus
      ? nextStatus.value
      : nextStatus;

    if (!targetValue || typeof targetValue !== 'string') {
      return false;
    }

    const upperTarget = targetValue.toUpperCase();
    const allowed = TRANSITION_MAP[this._value] || [];

    return allowed.includes(upperTarget);
  }

  assertTransitionTo(nextStatus) {
    if (!this.isTransitionAllowedTo(nextStatus)) {
      const target = nextStatus instanceof PaymentStatus
        ? nextStatus.value
        : nextStatus;

      throw new ValidationError(
        `Invalid state transition: ${this._value} → ${target}`,
      );
    }
  }

  isPending() {
    return this._value === PaymentStatus.PENDING;
  }

  isGatewayInitialized() {
    return this._value === PaymentStatus.GATEWAY_INITIALIZED;
  }

  isSuccessful() {
    return this._value === PaymentStatus.SUCCESSFUL;
  }

  isHeld() {
    return this._value === PaymentStatus.HELD;
  }

  isReleased() {
    return this._value === PaymentStatus.RELEASED;
  }

  isFailed() {
    return this._value === PaymentStatus.FAILED;
  }

  isPartiallyRefunded() {
    return this._value === PaymentStatus.PARTIALLY_REFUNDED;
  }

  isRefunded() {
    return this._value === PaymentStatus.REFUNDED;
  }

  isCanceled() {
    return this._value === PaymentStatus.CANCELED;
  }

  isTerminal() {
    return this.isFailed()
      || this.isRefunded()
      || this.isCanceled()
      || this.isReleased();
  }

  isSettled() {
    return this.isSuccessful()
      || this.isHeld()
      || this.isPartiallyRefunded()
      || this.isRefunded()
      || this.isReleased();
  }

  equals(other) {
    return other instanceof PaymentStatus
      && this._value === other.value;
  }

  toString() {
    return this._value;
  }
}
