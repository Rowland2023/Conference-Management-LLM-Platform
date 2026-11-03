import { DomainEvent } from '../../../shared/DomainEvent.js';

export class RegistrationUpdatedEvent extends DomainEvent {
  constructor({
    registrationId,
    conferenceId,
    userId,
    updatedFields,
    eventId,
    occurredAt = new Date(),
    correlationId,
    causationId
  }) {
    super({
      eventName: 'registration.updated',
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
      updatedFields: Object.freeze({ ...updatedFields })
    });

    Object.freeze(this);
  }
}