// modules/payment/domain/events/PaymentCancelledEvent.js
import { DomainEvent } from "../../../../../shared/domain/DomainEvent.js"; // Fix import path
import { ValidationError } from '../errors/PaymentErrors.js';

export class PaymentCancelledEvent extends DomainEvent {
  constructor({
    paymentId, // Will map to aggregateId in base class
    bookingId,
    tenantId,
    userId = null,
    amount,
    currency,
    gateway,
    reason = "User abandoned checkout session",
    cancelledBy = "CUSTOMER",
    cancelledAt = new Date(),
    // Keep downstream tracing capabilities open
    correlationId = null,
    causationId = null
  }) {
    // 1. Pass core metadata up to the base class constructor
    super({
      eventName: 'payment.cancelled',
      aggregateId: paymentId,
      occurredAt: cancelledAt instanceof Date ? cancelledAt : new Date(cancelledAt),
      correlationId,
      causationId
    });

    // 2. Subclass Validation Guards (Financial & Contextual)
    if (!bookingId) throw new ValidationError("Booking ID is required.");
    if (!tenantId) throw new ValidationError("Tenant ID is required.");
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new ValidationError("Payment amount must be a positive integer in minor units.");
    }
    if (!/^[A-Z]{3}$/i.test(currency)) {
      throw new ValidationError("Invalid currency code format.");
    }
    if (!gateway) throw new ValidationError("Gateway identifier is required.");
    if (!["CUSTOMER", "SYSTEM", "ADMIN"].includes(cancelledBy.toUpperCase())) {
      throw new ValidationError("Invalid actor assignment for cancelledBy attribute.");
    }

    // 3. Populate subclass payload
    this.payload = {
      paymentId,
      bookingId,
      tenantId,
      userId,
      amount,
      currency: currency.toUpperCase(),
      gateway,
      cancellation: {
        reason,
        initiatedBy: cancelledBy.toUpperCase()
      }
    };

    // 4. Guarantee deep immutability using the parent's base method
    this.freezeEvent();
  }

  /**
   * Overriding/Standardizing JSON structure across all events
   */
  toJSON() {
    return {
      eventName: this.metadata.eventName,
      eventVersion: this.metadata.eventVersion,
      metadata: this.metadata,
      payload: this.payload
    };
  }
}