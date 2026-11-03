// modules/payment/domain/events/PaymentFailedEvent.js

import { DomainEvent } from "../../../../../shared/domain/DomainEvent.js"; // Adjust path to fit your directory structure
import { ValidationError } from "../errors/PaymentErrors.js";

export class PaymentFailedEvent extends DomainEvent {
  constructor({
    id,                  // Passed to base class as eventId
    paymentId,           // Maps to aggregateId in the base class
    bookingId,
    tenantId,
    userId = null,
    amount,
    currency,
    gateway,
    idempotencyKey,
    failureReason,
    failureCode = "UNKNOWN_FAILURE",
    failedAt = new Date(),
    correlationId = null,
    causationId = null   // Keeps tracing context open for downstream logging
  }) {
    // 1. Pass core metadata up to the base class constructor
    super({
      eventName: 'payment.failed',
      aggregateId: paymentId,
      eventId: id,
      occurredAt: failedAt instanceof Date ? failedAt : new Date(failedAt),
      correlationId,
      causationId
    });

    // 2. Subclass-Specific Identity & Financial Guards
    if (!bookingId) throw new ValidationError("Booking ID is required.");
    if (!tenantId) throw new ValidationError("Tenant ID is required.");
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new ValidationError("Payment amount must be a positive integer in minor units.");
    }
    if (!/^[A-Z]{3}$/i.test(currency)) {
      throw new ValidationError("Invalid currency code format.");
    }

    // 3. Operational Failure Guards
    if (!gateway) throw new ValidationError("Gateway identifier is required.");
    if (!idempotencyKey) throw new ValidationError("Idempotency key is required.");
    if (!failureReason) throw new ValidationError("Failure reason message is required.");

    // 4. Populate subclass payload properties
    this.payload = {
      paymentId,
      bookingId,
      tenantId,
      userId,
      amount,
      currency: currency.toUpperCase(),
      gateway,
      idempotencyKey,
      failure: {
        reason: failureReason,
        code: failureCode.toUpperCase()
      }
    };

    // 5. Guarantee deep immutability across the entire payload automatically
    this.freezeEvent();
  }

  /**
   * Standardized serialization for Outbox DB / Kafka
   */
  toJSON() {
    return {
      eventName: this.metadata.eventName,
      version: this.metadata.eventVersion,
      metadata: this.metadata,
      payload: this.payload
    };
  }
}