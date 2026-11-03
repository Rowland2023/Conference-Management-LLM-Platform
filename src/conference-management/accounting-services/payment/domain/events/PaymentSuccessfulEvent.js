// src/conference-management/accounting-services/payment/domain/events/PaymentSuccessfulEvent.js

import { DomainEvent } from "../../../../../shared/domain/DomainEvent.js";

export class PaymentSuccessfulEvent extends DomainEvent {
  /**
   * @param {Object} props
   * @param {string} props.paymentId
   * @param {string} props.tenantId
   * @param {string} props.contextId
   * @param {string} props.contextType
   * @param {number} props.amount
   * @param {string} props.currency
   * @param {string} props.gatewayTransactionId
   * @param {string|null} [props.correlationId]
   * @param {string|null} [props.causationId]
   * @param {Date} [props.occurredAt]
   */
  constructor({
    paymentId,
    tenantId,
    contextId,
    contextType,
    amount,
    currency,
    gatewayTransactionId,
    correlationId = null,
    causationId = null,
    occurredAt = new Date(),
  }) {
    super({
      eventName: "payment.successful",
      aggregateId: paymentId,
      correlationId,
      causationId,
      occurredAt,
    });

    this.paymentId = paymentId;
    this.tenantId = tenantId;
    this.contextId = contextId;
    this.contextType = contextType;
    this.amount = amount;
    this.currency = currency;
    this.gatewayTransactionId = gatewayTransactionId;
  }

  /**
   * Serialize the event payload for messaging/outbox.
   * @returns {Object}
   */
  toJSON() {
    return {
      eventName: this.eventName,
      eventId: this.eventId,
      aggregateId: this.aggregateId,
      occurredAt: this.occurredAt,
      correlationId: this.correlationId,
      causationId: this.causationId,
      payload: {
        paymentId: this.paymentId,
        tenantId: this.tenantId,
        contextId: this.contextId,
        contextType: this.contextType,
        amount: this.amount,
        currency: this.currency,
        gatewayTransactionId: this.gatewayTransactionId,
      },
    };
  }
}