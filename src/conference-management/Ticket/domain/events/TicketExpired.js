// src/modules/ticket/domain/events/TicketExpired.js

import { DomainEvent } from "../../../../shared/domain/DomainEvent.js";

export class TicketExpired extends DomainEvent {
  static EVENT_NAME = "ticket.expired";

  /**
   * @param {Object} params
   * @param {string} params.ticketId
   * @param {string} params.conferenceId
   * @param {string} params.userId
   * @param {number} params.quantity
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
    correlationId = null,
    causationId = null,
    occurredAt,
    eventVersion = 1
  }) {
    super({
      eventName: TicketExpired.EVENT_NAME,
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
      quantity
    });

    this.freezeEvent();
  }
}