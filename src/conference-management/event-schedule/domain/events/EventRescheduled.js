import { DomainEvent } from "../../../../Shared/domain/DomainEvent.js";
import { DomainInvariantError } from "../../../../Shared/domain/error/DomainErrors.js";

export class EventRescheduled extends DomainEvent {
  constructor({
    eventId,
    previousStartTime,
    previousEndTime,
    newStartTime,
    newEndTime,
    rescheduledBy,
    reason = "user_request",
    occurredAt,
    correlationId = null,
    causationId = null,
    eventInstanceId,
  }) {
    const requiredStrings = {
      eventId,
      previousStartTime,
      previousEndTime,
      newStartTime,
      newEndTime,
      rescheduledBy,
    };

    for (const [field, value] of Object.entries(requiredStrings)) {
      if (typeof value !== "string" || !value.trim()) {
        throw new DomainInvariantError(
          `EventRescheduled: ${field} is required.`,
        );
      }
    }

    if (!occurredAt) {
      throw new DomainInvariantError(
        "EventRescheduled: occurredAt is required.",
      );
    }

    const previousStart = new Date(previousStartTime);
    const previousEnd = new Date(previousEndTime);
    const newStart = new Date(newStartTime);
    const newEnd = new Date(newEndTime);
    const parsedOccurred =
      occurredAt instanceof Date ? occurredAt : new Date(occurredAt);

    const dates = [
      ["previousStartTime", previousStart],
      ["previousEndTime", previousEnd],
      ["newStartTime", newStart],
      ["newEndTime", newEnd],
      ["occurredAt", parsedOccurred],
    ];

    for (const [field, date] of dates) {
      if (Number.isNaN(date.getTime())) {
        throw new DomainInvariantError(
          `EventRescheduled: Invalid ${field}.`,
        );
      }
    }

    super({
      eventName: "event.rescheduled",
      eventVersion: 1,
      aggregateId: eventId.trim(),
      eventId: eventInstanceId,
      occurredAt: parsedOccurred,
      correlationId,
      causationId,
    });

    this.payload = Object.freeze({
      eventId: eventId.trim(),
      previousStartTime: previousStart.toISOString(),
      previousEndTime: previousEnd.toISOString(),
      newStartTime: newStart.toISOString(),
      newEndTime: newEnd.toISOString(),
      rescheduledBy: rescheduledBy.trim(),
      reason:
        typeof reason === "string" && reason.trim()
          ? reason.trim()
          : "user_request",
    });

    this.freezeEvent();
  }

  static fromJSON(json) {
    if (!json || !json.payload || typeof json.payload !== "object") {
      throw new DomainInvariantError(
        "EventRescheduled: Cannot rehydrate from an invalid payload.",
      );
    }

    const { metadata, payload } = json;

    if (!metadata || typeof metadata !== "object") {
      throw new DomainInvariantError(
        "EventRescheduled: Historical metadata is required.",
      );
    }

    if (!metadata.occurredAt) {
      throw new DomainInvariantError(
        "EventRescheduled: Historical occurredAt is required.",
      );
    }

    if (
      !metadata.aggregateId ||
      metadata.aggregateId !== payload.eventId
    ) {
      throw new DomainInvariantError(
        "EventRescheduled: aggregateId does not match payload eventId.",
      );
    }

    return new EventRescheduled({
      eventId: payload.eventId,
      previousStartTime: payload.previousStartTime,
      previousEndTime: payload.previousEndTime,
      newStartTime: payload.newStartTime,
      newEndTime: payload.newEndTime,
      rescheduledBy: payload.rescheduledBy,
      reason: payload.reason,
      occurredAt: metadata.occurredAt,
      correlationId: metadata.correlationId,
      causationId: metadata.causationId,
      eventInstanceId: metadata.eventId,
    });
  }
}
