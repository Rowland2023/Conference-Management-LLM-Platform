// src/modules/ticket/domain/events/TicketReserved.js
import { DomainEvent } from "../../../../shared/domain/DomainEvent.js";

export class TicketReserved extends DomainEvent {
  static EVENT_NAME = "ticket.reserved";

  /**
   * @param {Object} params
   * @param {string} params.ticketId
   * @param {string} params.conferenceId
   * @param {string} params.userId
   * @param {number} params.quantity
   * @param {number} params.availableAfter
   * @param {Date} params.expiresAt
   * @param {string|null} [params.correlationId]
   * @param {string|null} [params.causationId]
   * @param {Date} [params.occurredAt]
   * @param {number} [params.eventVersion=1]
   */
  constructor({
    ticketId,
    conferenceId,
    userId,
    quantity,
    availableAfter,
    expiresAt,
    correlationId = null,
    causationId = null,
    occurredAt,
    eventVersion = 1
  }) {
    super({
      eventName: TicketReserved.EVENT_NAME,
      aggregateId: ticketId,
      eventVersion,
      occurredAt,
      correlationId,
      causationId
    });

    this.payload = Object.freeze({
      ticketId,
      conferenceId,
      userId,
      quantity,
      availableAfter,
      expiresAt: expiresAt.toISOString()
    });

    this.freezeEvent();
  }
}