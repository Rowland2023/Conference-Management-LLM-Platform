
import { DomainEvent } from "../../../../shared/domain/DomainEvent.js";

export class TicketCreated extends DomainEvent {
  static EVENT_NAME = "ticket.created";

  constructor({
    ticketId,
    conferenceId,
    type,
    capacity,
    price,
    currency,
    correlationId = null,
    causationId = null,
    occurredAt,
    eventVersion = 1,
  }) {
    super({
      eventName: TicketCreated.EVENT_NAME,
      aggregateId: ticketId,
      correlationId,
      causationId,
      occurredAt,
      eventVersion,
    });

    this.payload = Object.freeze({
      ticketId,
      conferenceId,
      type,
      capacity,
      price,
      currency,
    });

    this.freezeEvent();
  }
}
