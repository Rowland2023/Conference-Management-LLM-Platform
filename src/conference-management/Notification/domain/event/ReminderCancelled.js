import { DomainEvent } from "../../../../shared/domain/DomainEvent.js";
import { ValidationError }
from "../../../../shared/application/errors/ApplicationErrors.js";

const CANCELLATION_REASONS = new Set([
  'user_request', 
  'conference_cancelled', 
  'admin_action',
  'system_policy'
]);

export class ReminderCancelled extends DomainEvent {
    constructor({
        notificationId,
        conferenceId,
        cancelledBy = 'system',
        reason,
        cancelledAt, // required - no default
        correlationId = null,
        causationId = null
    }) {
        if (!notificationId) {
            throw new ValidationError("ReminderCancelled: notificationId is required.");
        }
        if (!conferenceId) {
            throw new ValidationError("ReminderCancelled: conferenceId is required.");
        }
        if (!cancelledAt) {
            throw new ValidationError("ReminderCancelled: cancelledAt is required.");
        }
        if (reason && !CANCELLATION_REASONS.has(reason)) {
            throw new ValidationError(`ReminderCancelled: invalid reason '${reason}'.`);
        }

        const timestamp = new Date(cancelledAt);
        if (Number.isNaN(timestamp.getTime())) {
            throw new ValidationError("ReminderCancelled: cancelledAt must be valid date.");
        }

        super({
            eventName: "reminder.cancelled",
            eventVersion: 1,
            aggregateId: notificationId,
            occurredAt: timestamp,
            correlationId,
            causationId
        });

        this.payload = Object.freeze({
            notificationId,
            conferenceId,
            cancelledBy,
            reason,
            cancelledAt: timestamp.toISOString()
        });

        this.freezeEvent();
    }

    static from(persisted) {
        return new ReminderCancelled({
            ...persisted.payload,
            cancelledAt: persisted.payload.cancelledAt,
            correlationId: persisted.metadata.correlationId,
            causationId: persisted.metadata.causationId
        });
    }
}