import { DomainEvent } from "../../../shared/domain/DomainEvent.js";
import { createHash } from "crypto";

const ALLOWED_CHANNELS = new Set(['email', 'sms', 'push', 'in_app']);

function deterministicId(notificationId, readAt) {
  return createHash('sha256')
    .update(`${notificationId}:${new Date(readAt).toISOString()}`)
    .digest('hex');
}

export class NotificationRead extends DomainEvent {
  constructor({
    notificationId,
    userId = null,
    recipient,
    channel,
    readAt, // required - no default
    metadata = {},
    correlationId = null,
    causationId = null
  }) {
    if (!notificationId) throw new Error("Event Invariant Error: 'notificationId' required.");
    if (!recipient) throw new Error("Event Invariant Error: 'recipient' required.");
    if (!ALLOWED_CHANNELS.has(channel)) {
      throw new Error(`Event Invariant Error: Invalid channel '${channel}'.`);
    }
    if (!readAt) throw new Error("Event Invariant Error: 'readAt' required.");
    
    const readTimestamp = new Date(readAt);
    if (Number.isNaN(readTimestamp.getTime())) {
      throw new Error("Event Invariant Error: 'readAt' must be valid date.");
    }

    super({
      eventName: "notification.read",
      eventVersion: 1,
      aggregateId: notificationId,
      eventId: deterministicId(notificationId, readAt), // deterministic for idempotency
      occurredAt: readTimestamp, // domain time
      correlationId,
      causationId
    });

    this.payload = Object.freeze({
      notificationId,
      userId,
      recipient,
      channel,
      readAt: readTimestamp.toISOString(),
      metadata: Object.freeze(structuredClone(metadata))
    });

    this.freezeEvent();
  }
}