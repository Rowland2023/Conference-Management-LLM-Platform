// modules/payment/domain/events/PaymentRefundedEvent.js

import { DomainEvent } from "../../../../../shared/domain/DomainEvent.js"; // Adjust path to fit your directory structure
import { ValidationError } from "../errors/PaymentErrors.js";

export class PaymentRefundedEvent extends DomainEvent {
  constructor({
    id,                  // Passed to base class as eventId
    paymentId,           // Maps to aggregateId in the base class
    bookingId,
    tenantId = null,
    amountRefunded,
    remainingBalance,
    currency,
    status,
    processedBy,
    occurredAt = new Date(),
    correlationId = null,
    causationId = null   // Keeps tracing context open for downstream logging
  }) {
    // 1. Pass core metadata up to the base class constructor
    super({
      eventName: 'payment.refunded',
      aggregateId: paymentId,
      eventId: id,
      occurredAt: occurredAt instanceof Date ? occurredAt : new Date(occurredAt),
      correlationId,
      causationId
    });

    // 2. Subclass-Specific Structural Guards
    if (!bookingId) throw new ValidationError("Booking ID required.");

    // 3. Core Financial Integrity Guards (Minor Units / Integers)
    if (!Number.isInteger(amountRefunded) || amountRefunded <= 0) {
      throw new ValidationError("Refund amount must be a positive integer in minor units.");
    }
    if (!Number.isInteger(remainingBalance) || remainingBalance < 0) {
      throw new ValidationError("Remaining balance must be a non-negative integer in minor units.");
    }

    // 4. State & Vocabulary Guards
    if (!["PARTIALLY_REFUNDED", "REFUNDED"].includes(status)) {
      throw new ValidationError("Invalid refund state.");
    }
    if (!/^[A-Z]{3}$/i.test(currency)) {
      throw new ValidationError("Invalid currency code.");
    }

    // 5. Populate subclass payload properties
    this.payload = {
      paymentId,
      bookingId,
      tenantId,
      amountRefunded,
      remainingBalance,
      currency: currency.toUpperCase(),
      status,
      processedBy
    };

    // 6. Guarantee deep immutability across the entire payload automatically
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