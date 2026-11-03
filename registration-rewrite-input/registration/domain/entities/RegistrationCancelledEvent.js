import { DomainEvent } from "../../../../shared/domain/DomainEvent.js";
import { DomainInvariantError } from "../../../../shared/domain/error/DomainErrors.js";

const CANCELLATION_REASONS = new Set([
  'user_request',
  'payment_failed', 
  'admin_action',
  'conference_cancelled',
  'fraud_suspected'
]);

export class RegistrationCancelledEvent extends DomainEvent {
  constructor({
    registrationId,
    conferenceId,
    userId,
    reason, // required, must be enum
    occurredAt, // required, no default
    correlationId = null,
    causationId = null
  }) {
    if (!registrationId) throw new DomainInvariantError("RegistrationCancelledEvent: registrationId required.");
    if (!conferenceId) throw new DomainInvariantError("RegistrationCancelledEvent: conferenceId required.");
    if (!userId) throw new DomainInvariantError("RegistrationCancelledEvent: userId required.");
    if (!reason) throw new DomainInvariantError("RegistrationCancelledEvent: reason required.");
    if (!CANCELLATION_REASONS.has(reason)) {
      throw new DomainInvariantError(`RegistrationCancelledEvent: invalid reason '${reason}'`);
    }
    if (!occurredAt) throw new DomainInvariantError("RegistrationCancelledEvent: occurredAt required.");

    const parsedOccurred = new Date(occurredAt);
    if (Number.isNaN(parsedOccurred.getTime())) {
      throw new DomainInvariantError("RegistrationCancelledEvent: invalid occurredAt");
    }

    super({
      eventName: "registration.cancelled",
      eventVersion: 1,
      aggregateId: registrationId,
      occurredAt: parsedOccurred,
      correlationId,
      causationId
    });

    this.payload = Object.freeze({
      registrationId,
      conferenceId,
      userId,
      reason // no normalization - record what aggregate sent
    });

    this.freezeEvent();
  }

  static fromJSON(json) {
    if (!json?.payload) {
      throw new DomainInvariantError("RegistrationCancelledEvent: Cannot rehydrate from empty payload.");
    }
    if (json.aggregateId !== json.payload.registrationId) {
      throw new DomainInvariantError("RegistrationCancelledEvent: aggregateId mismatch in persisted data.");
    }

    return new RegistrationCancelledEvent({
      registrationId: json.payload.registrationId,
      conferenceId: json.payload.conferenceId,
      userId: json.payload.userId,
      reason: json.payload.reason,
      occurredAt: json.metadata.occurredAt,
      correlationId: json.metadata.correlationId,
      causationId: json.metadata.causationId
    });
  }
}