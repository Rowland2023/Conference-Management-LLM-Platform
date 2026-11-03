// src/modules/ticket/domain/events/TicketReleased.js
import { DomainEvent } from "../../../../shared/domain/DomainEvent.js";

export class TicketReleased extends DomainEvent {
  static EVENT_NAME = "ticket.released";

  /**
   * @param {Object} params
   * @param {string} params.ticketId
   * @param {string} params.conferenceId
   * @param {number} params.quantity
   * @param {number} params.availableAfter
   * @param {string|null} [params.correlationId]
   * @param {string|null} [params.causationId]
   * @param {Date} [params.occurredAt]
   * @param {number} [params.eventVersion=1]
   */
  constructor({
    ticketId,
    conferenceId,
    quantity,
    availableAfter,
    correlationId = null,
    causationId = null,
    occurredAt,
    eventVersion = 1
  }) {
    super({
      eventName: TicketReleased.EVENT_NAME,
      aggregateId: ticketId,
      eventVersion,
      occurredAt,
      correlationId,
      causationId
    });

    this.payload = Object.freeze({
      ticketId,
      conferenceId,
      quantity,
      availableAfter
    });

    this.freezeEvent();
  }
}