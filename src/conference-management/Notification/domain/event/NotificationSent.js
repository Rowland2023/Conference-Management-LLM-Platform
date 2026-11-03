// src/modules/notification/domain/events/NotificationSent.js
import { DomainEvent } from "../../../../shared/domain/DomainEvent.js"; 
import { ValidationError } from "../../../../shared/domain/errors/DomainError.js";

const ALLOWED_CHANNELS = new Set(['email', 'sms', 'push', 'in_app']);

export class NotificationSent extends DomainEvent {
    constructor({
        notificationId,
        userId = null,
        contextType = null, // 'conference', 'payment', 'order' etc
        contextId = null,
        channel,
        sentAt, // required - no default
        providerMessageId = null, // Paystack/Termii message ID for tracing
        correlationId = null,
        causationId = null
    }) {
        // 1. Core Domain Boundary Guards
        if (!notificationId) {
            throw new ValidationError("NotificationSent: notificationId is required.");
        }
        if (!channel) {
            throw new ValidationError("NotificationSent: channel is required.");
        }
        if (!ALLOWED_CHANNELS.has(channel)) {
            throw new ValidationError(`NotificationSent: Invalid channel '${channel}'. Allowed: ${[...ALLOWED_CHANNELS].join(', ')}`);
        }
        if (!sentAt) {
            throw new ValidationError("NotificationSent: sentAt is required.");
        }

        const timestamp = new Date(sentAt);
        if (Number.isNaN(timestamp.getTime())) {
            throw new ValidationError("NotificationSent: sentAt must be a valid date.");
        }

        // 2. Delegate Structural Routing & Envelope Metadata to Parent
        super({
            eventName: "notification.sent",
            eventVersion: 1, // Explicit structural versioning
            aggregateId: notificationId,
            occurredAt: timestamp, // Real domain time mapped from provider receipt
            correlationId,
            causationId
        });

        // 3. Formulate Domain Business Payload
        this.payload = {
            notificationId,
            userId,
            contextType,
            contextId,
            channel,
            sentAt: timestamp.toISOString(),
            providerMessageId
        };

        // 4. Atomic deep-freeze to protect runtime telemetry channels
        this.freezeEvent();
    }

    /**
     * Plain Object serialization mapping for DB Outbox logging and Event brokers.
     */
    toJSON() {
        return {
            eventName: this.metadata.eventName,
            version: this.metadata.eventVersion,
            metadata: this.metadata,
            payload: this.payload
        };
    }
}