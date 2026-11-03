// src/modules/ticket/domain/events/TicketCancelled.js

import { DomainEvent } from "../../../../shared/domain/DomainEvent.js";

export class TicketCancelled extends DomainEvent {
  static EVENT_NAME = "ticket.cancelled";

  /**
   * @param {Object} params
   * @param {string} params.ticketId
   * @param {string} params.conferenceId
   * @param {string} params.reason
   * @param {number} params.refundableCount
   * @param {number} params.reservedToRelease
   * @param {string|null} [params.correlationId]
   * @param {string|null} [params.causationId]
   * @param {Date} [params.occurredAt]
   * @param {number} [params.eventVersion=1]
   */
  constructor({
    ticketId,
    conferenceId,
    reason,
    refundableCount,
    reservedToRelease,
    correlationId = null,
    causationId = null,
    occurredAt,
    eventVersion = 1
  }) {
    super({
      eventName: TicketCancelled.EVENT_NAME,
      aggregateId: ticketId,
      eventVersion,
      occurredAt,
      correlationId,
      causationId
    });

    this.payload = Object.freeze({
      ticketId,
      conferenceId,
      reason,
      refundableCount,
      reservedToRelease
    });

    this.freezeEvent();
  }
}