import { DomainEvent } from '../../../shared/DomainEvent.js';

export class RegistrationCreatedEvent extends DomainEvent {
  constructor({
    registrationId,
    conferenceId,
    userId,
    ticketType,
    eventId,
    occurredAt = new Date(),
    correlationId,
    causationId
  }) {
    super({
      eventName: 'registration.created',
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
      ticketType
    });

    Object.freeze(this);
  }
}