import { DomainEvent } from "../../../../Shared/domain/DomainEvent.js";
import { DomainInvariantError } from "../../../../Shared/domain/error/DomainErrors.js";

export class EventCancelled extends DomainEvent {
  constructor({
    eventId,
    cancelledBy,
    reason = null,
    occurredAt = new Date(),
    correlationId = null,
    causationId = null,
    eventInstanceId,
  }) {
    if (typeof eventId !== "string" || !eventId.trim()) {
      throw new DomainInvariantError("EventCancelled: eventId is required.");
    }

    if (typeof cancelledBy !== "string" || !cancelledBy.trim()) {
      throw new DomainInvariantError("cancelledBy is required for audit.");
    }

    const parsedOccurred =
      occurredAt instanceof Date ? occurredAt : new Date(occurredAt);

    if (Number.isNaN(parsedOccurred.getTime())) {
      throw new DomainInvariantError(
        "EventCancelled: Invalid occurredAt timestamp.",
      );
    }

    const normalizedReason =
      typeof reason === "string" && reason.trim() ? reason.trim() : null;

    super({
      eventName: "event.cancelled",
      eventVersion: 1,
      aggregateId: eventId.trim(),
      eventId: eventInstanceId,
      occurredAt: parsedOccurred,
      correlationId,
      causationId,
    });

    this.payload = Object.freeze({
      eventId: eventId.trim(),
      cancelledBy: cancelledBy.trim(),
      reason: normalizedReason,
    });

    this.freezeEvent();
  }

  toJSON() {
    return {
      eventName: this.metadata.eventName,
      version: this.metadata.eventVersion,
      metadata: this.metadata,
      payload: this.payload,
    };
  }

  static fromJSON(json) {
    if (!json || !json.payload || typeof json.payload !== "object") {
      throw new DomainInvariantError(
        "EventCancelled: Cannot rehydrate from an invalid payload.",
      );
    }

    const { metadata, payload } = json;

    if (!metadata || typeof metadata !== "object") {
      throw new DomainInvariantError(
        "EventCancelled: Historical metadata is required.",
      );
    }

    if (!metadata.occurredAt) {
      throw new DomainInvariantError(
        "EventCancelled: Historical occurredAt is required.",
      );
    }

    if (
      !metadata.aggregateId ||
      metadata.aggregateId !== payload.eventId
    ) {
      throw new DomainInvariantError(
        "EventCancelled: aggregateId does not match payload eventId.",
      );
    }

    return new EventCancelled({
      eventId: payload.eventId,
      cancelledBy: payload.cancelledBy,
      reason: payload.reason,
      occurredAt: metadata.occurredAt,
      correlationId: metadata.correlationId,
      causationId: metadata.causationId,
      eventInstanceId: metadata.eventId,
    });
  }
}
