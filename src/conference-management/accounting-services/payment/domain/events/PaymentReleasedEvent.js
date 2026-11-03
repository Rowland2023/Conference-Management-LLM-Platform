// src/modules/payment/domain/events/PaymentReleasedEvent.js
import { DomainEvent } from "../../../../../shared/domain/DomainEvent.js";
import { ValidationError } from '../errors/PaymentErrors.js';

const SUPPORTED_CURRENCIES = new Set(['NGN', 'USD', 'GHS', 'KES', 'ZAR', 'EUR', 'GBP']);

/**
 * Fired when escrowed funds are successfully released to seller/merchant.
 * Triggers: ledger entry, seller payout via provider, notifications, order service webhook.
 * MUST be idempotent: handling twice must not double-pay.
 */
export class PaymentReleasedEvent extends DomainEvent {
  constructor({
    id,                  // eventId -> base class
    paymentId,           // aggregateId -> base class  
    tenantId = null,
    contextId,           // orderId, bookingId, escrowId
    contextType,         // 'order', 'booking', 'escrow'
    sellerId,            // recipient user_xxx or merchant_xxx
    amountReleased,      // minor units: kobo/cents. Integer only.
    currency,
    gatewayTransactionId, // Paystack/Flutterwave ref for reconciliation
    status = 'RELEASED',
    occurredAt,          // REQUIRED. No default. Decision timestamp.
    correlationId = null,
    causationId = null
  }) {
    // 1. Pass core metadata to base DomainEvent
    super({
      eventName: 'payment.released',
      eventVersion: 1,
      aggregateId: paymentId,
      eventId: id,
      occurredAt: occurredAt instanceof Date ? occurredAt : new Date(occurredAt),
      correlationId,
      causationId
    });

    // 2. Structural Guards
    if (!contextId) throw new ValidationError("PaymentReleasedEvent: contextId required");
    if (!contextType) throw new ValidationError("PaymentReleasedEvent: contextType required");
    if (!sellerId) throw new ValidationError("PaymentReleasedEvent: sellerId required");
    if (!gatewayTransactionId) {
      throw new ValidationError("PaymentReleasedEvent: gatewayTransactionId required for reconciliation");
    }
    if (!occurredAt) {
      throw new ValidationError("PaymentReleasedEvent: occurredAt required for audit");
    }

    // 3. Financial Integrity Guards - minor units only
    if (!Number.isInteger(amountReleased) || amountReleased <= 0) {
      throw new ValidationError("PaymentReleasedEvent: amountReleased must be positive integer in minor units");
    }
    if (!currency || !SUPPORTED_CURRENCIES.has(currency.toUpperCase())) {
      throw new ValidationError(`PaymentReleasedEvent: unsupported currency ${currency}`);
    }

    // 4. State Guards
    if (status !== 'RELEASED') {
      throw new ValidationError("PaymentReleasedEvent: status must be 'RELEASED'");
    }

    // 5. Immutable payload - matches your PaymentRefundedEvent pattern
    this.payload = {
      paymentId,
      tenantId,
      contextId,
      contextType,
      sellerId,
      amountReleased,
      currency: currency.toUpperCase(),
      gatewayTransactionId,
      status
    };

    // 6. Deep freeze via base class
    this.freezeEvent();
  }

  /**
   * Standardized serialization for Outbox/Kafka
   * Matches your PaymentRefundedEvent.toJSON()
   */
  toJSON() {
    return {
      eventName: this.metadata.eventName,
      version: this.metadata.eventVersion,
      metadata: this.metadata,
      payload: this.payload
    };
  }

  /**
   * Rehydration from persistence. Fails on corruption.
   */
  static fromJSON(json) {
    if (!json?.payload) {
      throw new ValidationError("PaymentReleasedEvent: Cannot rehydrate from empty payload");
    }
    if (json.aggregateId !== json.payload.paymentId) {
      throw new ValidationError("PaymentReleasedEvent: aggregateId mismatch");
    }

    return new PaymentReleasedEvent({
      id: json.metadata.eventId,
      paymentId: json.payload.paymentId,
      tenantId: json.payload.tenantId,
      contextId: json.payload.contextId,
      contextType: json.payload.contextType,
      sellerId: json.payload.sellerId,
      amountReleased: json.payload.amountReleased,
      currency: json.payload.currency,
      gatewayTransactionId: json.payload.gatewayTransactionId,
      status: json.payload.status,
      occurredAt: json.metadata.occurredAt,
      correlationId: json.metadata.correlationId,
      causationId: json.metadata.causationId
    });
  }
}