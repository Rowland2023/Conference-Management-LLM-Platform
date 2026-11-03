import { DomainEvent } from '../../../../shared/DomainEvent.js';

export class AttendeeCheckedInEvent extends DomainEvent {
  /**
   * @param {Object} params
   * @param {string} params.registrationId - Unique identifier of the checked-in registration
   * @param {string} params.conferenceId - Associated conference identifier
   * @param {string} params.userId - Associated attendee user identifier
   * @param {Date} [params.checkedInAt] - Precise timestamp of physical arrival
   * @param {string} [params.eventId] - Trace-aware event tracking ID
   * @param {Date} [params.occurredAt] - Generation timestamp
   * @param {string} [params.correlationId] - Distributed system correlation tracer
   * @param {string} [params.causationId] - Distributed system causation tracer
   */
  constructor({
    registrationId,
    conferenceId,
    userId,
    checkedInAt = new Date(),
    eventId,
    occurredAt = new Date(),
    correlationId,
    causationId
  }) {
    super({
      eventName: 'attendee.checked-in',
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
      checkedInAt
    });

    Object.freeze(this);
  }
}