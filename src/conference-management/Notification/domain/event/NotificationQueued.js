// modules/notification/domain/events/NotificationQueued.js
import { DomainEvent } from "../../../shared/domain/DomainEvent.js";

const ALLOWED_CHANNELS = new Set(['email', 'sms', 'push', 'in_app']);

export class NotificationQueued extends DomainEvent {
  constructor({
    notificationId,
    userId = null,
    recipient,
    channel,
    metadata = {},
    occurredAt = new Date(),
    correlationId = null,
    causationId = null
  }) {
    if (!notificationId) {
      throw new Error("Event Invariant Error: 'notificationId' required.");
    }
    if (!recipient) {
      throw new Error("Event Invariant Error: 'recipient' required.");
    }
    if (!ALLOWED_CHANNELS.has(channel)) {
      throw new Error(`Event Invariant Error: Invalid channel '${channel}'.`);
    }

    super({
      eventName: "notification.queued",
      eventVersion: 1,
      aggregateId: notificationId,
      occurredAt,
      correlationId,
      causationId
    });

    this.payload = Object.freeze({
      notificationId,
      userId,
      recipient,
      channel,
      metadata: Object.freeze(structuredClone(metadata))
    });

    this.freezeEvent();
  }

  static from(persisted) {
    return new NotificationQueued({
      ...persisted.payload,
      occurredAt: new Date(persisted.metadata.occurredAt),
      correlationId: persisted.metadata.correlationId,
      causationId: persisted.metadata.causationId
    });
  }
}