import { DomainEvent } from "../../../../shared/domain/DomainEvent.js";
import { ValidationError }
from "../../../../shared/application/errors/ApplicationErrors.js";

const ALLOWED_CHANNELS = new Set(['email', 'sms', 'push', 'in_app']);

export class ReminderDelivered extends DomainEvent {
    constructor({
        notificationId,
        conferenceId,
        userId = null,
        channel,
        deliveredAt, // required - no default
        providerMessageId = null, // Termii/Twilio/Paystack ID for reconciliation
        correlationId = null,
        causationId = null
    }) {
        if (!notificationId) {
            throw new ValidationError("ReminderDelivered: notificationId is required.");
        }
        if (!conferenceId) {
            throw new ValidationError("ReminderDelivered: conferenceId is required.");
        }
        if (!channel) {
            throw new ValidationError("ReminderDelivered: channel is required.");
        }
        if (!ALLOWED_CHANNELS.has(channel)) {
            throw new ValidationError(`ReminderDelivered: Invalid channel '${channel}'. Allowed: ${[...ALLOWED_CHANNELS].join(', ')}`);
        }
        if (!deliveredAt) {
            throw new ValidationError("ReminderDelivered: deliveredAt is required.");
        }

        const timestamp = new Date(deliveredAt);
        if (Number.isNaN(timestamp.getTime())) {
            throw new ValidationError("ReminderDelivered: deliveredAt must be valid date.");
        }

        super({
            eventName: "reminder.delivered",
            eventVersion: 1,
            aggregateId: notificationId,
            occurredAt: timestamp, // use provider timestamp, not system time
            correlationId,
            causationId
        });

        this.payload = Object.freeze({
            notificationId,
            conferenceId,
            userId,
            channel,
            deliveredAt: timestamp.toISOString(),
            providerMessageId // critical for webhook matching
        });

        this.freezeEvent();
    }

    static from(persisted) {
        return new ReminderDelivered({
            ...persisted.payload,
            deliveredAt: persisted.payload.deliveredAt,
            correlationId: persisted.metadata.correlationId,
            causationId: persisted.metadata.causationId
        });
    }
}