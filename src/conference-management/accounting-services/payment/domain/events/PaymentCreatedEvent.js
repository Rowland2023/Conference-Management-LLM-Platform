// modules/payment/domain/events/PaymentCreatedEvent.js

import { DomainEvent } from "../../../../../shared/domain/DomainEvent.js"; // Adjust path based on your directory structure
import { ValidationError } from "../errors/PaymentErrors.js";

export class PaymentCreatedEvent extends DomainEvent {
  constructor({
    id,                  // Passed to base class as eventId
    paymentId,           // Maps to aggregateId in the base class
    bookingId,
    tenantId = null,
    userId = null,
    amount,
    currency,
    gateway = null,
    email,
    idempotencyKey,
    correlationId = null,
    causationId = null,  // Keep downstream tracing capabilities open
    createdAt = new Date()
  }) {
    // 1. Pass core metadata up to the base class constructor
    super({
      eventName: 'payment.created',
      aggregateId: paymentId,
      eventId: id,
      occurredAt: createdAt instanceof Date ? createdAt : new Date(createdAt),
      correlationId,
      causationId
    });

    // 2. Subclass-Specific Identity Guards
    if (!bookingId || typeof bookingId !== "string") {
      throw new ValidationError("Booking ID is required.");
    }

    // Support both individual and corporate payments
    if (!tenantId && !userId) {
      throw new ValidationError("Either tenantId or userId is required.");
    }

    // 3. Financial Intent Guards
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new ValidationError("Payment amount must be a positive integer in minor units.");
    }

    if (typeof currency !== "string" || !/^[A-Z]{3}$/i.test(currency)) {
      throw new ValidationError("Invalid currency code format. Must be ISO 3-letter code.");
    }

    // 4. Customer & Request Integrity Guards
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ValidationError("A valid customer email is required.");
    }

    if (!idempotencyKey || typeof idempotencyKey !== "string") {
      throw new ValidationError("Idempotency key is required.");
    }

    // 5. Immutable Business Payload
    this.payload = {
      paymentId,
      bookingId,
      tenantId,
      userId,
      amount,
      currency: currency.toUpperCase(),
      gateway,
      email,
      idempotencyKey
    };

    // 6. Prevent mutation using inherited parent method
    this.freezeEvent();
  }

  /**
   * Standardized serialization for Outbox table / Kafka
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