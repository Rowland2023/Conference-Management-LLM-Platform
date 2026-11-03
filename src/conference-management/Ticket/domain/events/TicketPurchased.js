
import { DomainEvent } from "../../../../shared/domain/DomainEvent.js";

export class TicketPurchased extends DomainEvent {
  static EVENT_NAME = "ticket.purchased";

  constructor({
    ticketId,
    conferenceId,
    quantity,
    paymentId,
    soldTotal,
    revenue,
    currency,
    correlationId = null,
    causationId = null,
    occurredAt,
    eventVersion = 1,
  }) {
    super({
      eventName: TicketPurchased.EVENT_NAME,
      aggregateId: ticketId,
      correlationId,
      causationId,
      occurredAt,
      eventVersion,
    });

    this.payload = Object.freeze({
      ticketId,
      conferenceId,
      quantity,
      paymentId,
      soldTotal,
      revenue,
      currency,
    });

    this.freezeEvent();
  }
}
