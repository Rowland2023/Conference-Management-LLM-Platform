import { DomainEvent } from '../../../shared/DomainEvent.js';

export class RegistrationConfirmedEvent extends DomainEvent {
  constructor({
    registrationId,
    conferenceId,
    userId,
    ticketType,
    paymentId,
    eventId,
    occurredAt = new Date(),
    correlationId,
    causationId
  }) {
    super({
      eventName: 'registration.confirmed',
      eventVersion: 1,
      eventId,
      occurredAt,
      correlationId,
      causationId
    });

    this.payload = Object.freeze({
      registrationId,
      conferenceId,
      userId,
      ticketType,
      paymentId // ← critical for payment reconciliation
    });

    Object.freeze(this);
  }
}