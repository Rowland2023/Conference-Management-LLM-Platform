// modules/payment/domain/events/PaymentCompletedEvent.js
import { DomainEvent } from "../../../../../shared/domain/DomainEvent.js"; // Adjust path based on your layout
import { ValidationError } from "../errors/PaymentErrors.js";

export class PaymentCompletedEvent extends DomainEvent {
  constructor({
    id, // Passed to base class as eventId
    paymentId, // Maps to aggregateId in the base class
    bookingId,
    tenantId,
    userId = null,
    amount,
    currency,
    gateway,
    gatewayTransactionId,
    idempotencyKey,
    paidAt = new Date(),
    correlationId = null,
    causationId = null
  }) {
    // 1. Pass core metadata up to the base class constructor
    super({
      eventName: 'payment.completed',
      aggregateId: paymentId,
      eventId: id, // Extracted and validated by the base DomainEvent
      occurredAt: paidAt instanceof Date ? paidAt : new Date(paidAt),
      correlationId,
      causationId
    });

    // 2. Subclass Validation Guards (Business Integrity)
    if (!bookingId) throw new ValidationError("Booking ID is required.");
    if (!tenantId) throw new ValidationError("Tenant ID is required.");
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new ValidationError("Payment amount must be a positive integer in minor units.");
    }
    if (!/^[A-Z]{3}$/i.test(currency)) {
      throw new ValidationError("Invalid currency code format. Must be an ISO 3-letter string.");
    }
    if (!gateway) throw new ValidationError("Gateway identifier is required.");
    if (!gatewayTransactionId) throw new ValidationError("Gateway transaction reference ID is required.");
    if (!idempotencyKey) throw new ValidationError("Idempotency key is required.");

    // 3. Populate subclass payload properties
    this.payload = {
      paymentId,
      bookingId,
      tenantId,
      userId,
      amount,
      currency: currency.toUpperCase(),
      gateway,
      gatewayTransactionId,
      idempotencyKey
    };

    // 4. Guarantee deep immutability using base utility
    this.freezeEvent();
  }

  /**
   * Overrides/Standardizes JSON structure across all events
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