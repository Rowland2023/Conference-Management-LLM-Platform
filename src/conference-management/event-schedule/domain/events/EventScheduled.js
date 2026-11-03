import { DomainEvent } from "../../../../Shared/domain/DomainEvent.js";
import { DomainInvariantError } from "../../../../Shared/domain/error/DomainErrors.js";

const MAX_EVENT_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const ISO_UTC_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

export class EventScheduled extends DomainEvent {
  constructor({
    eventId,
    title,
    roomId,
    startTime,
    endTime,
    occurredAt = new Date(),
    correlationId = null,
    causationId = null,
    eventInstanceId,
  }) {
    if (typeof eventId !== "string" || !eventId.trim()) {
      throw new DomainInvariantError("EventScheduled: eventId is required.");
    }
    if (typeof title !== "string" || !title.trim()) {
      throw new DomainInvariantError("EventScheduled: title is required.");
    }
    if (typeof roomId !== "string" || !roomId.trim()) {
      throw new DomainInvariantError("EventScheduled: roomId is required.");
    }
    if (typeof startTime !== "string" || !ISO_UTC_REGEX.test(startTime)) {
      throw new DomainInvariantError(
        "EventScheduled: startTime must be ISO-8601 UTC.",
      );
    }
    if (typeof endTime !== "string" || !ISO_UTC_REGEX.test(endTime)) {
      throw new DomainInvariantError(
        "EventScheduled: endTime must be ISO-8601 UTC.",
      );
    }

    const parsedStart = new Date(startTime);
    const parsedEnd = new Date(endTime);
    const parsedOccurred =
      occurredAt instanceof Date ? occurredAt : new Date(occurredAt);

    if (
      Number.isNaN(parsedStart.getTime()) ||
      Number.isNaN(parsedEnd.getTime()) ||
      Number.isNaN(parsedOccurred.getTime())
    ) {
      throw new DomainInvariantError(
        "EventScheduled: One or more timestamps are invalid.",
      );
    }

    if (parsedStart >= parsedEnd) {
      throw new DomainInvariantError(
        "EventScheduled: startTime must be before endTime.",
      );
    }

    if (parsedEnd - parsedStart > MAX_EVENT_DURATION_MS) {
      throw new DomainInvariantError(
        `EventScheduled: duration exceeds maximum of ${MAX_EVENT_DURATION_MS}ms.`,
      );
    }

    super({
      eventName: "event.scheduled",
      eventVersion: 1,
      aggregateId: eventId.trim(),
      eventId: eventInstanceId,
      occurredAt: parsedOccurred,
      correlationId,
      causationId,
    });

    this.payload = Object.freeze({
      eventId: eventId.trim(),
      title: title.trim(),
      roomId: roomId.trim(),
      startTime: parsedStart.toISOString(),
      endTime: parsedEnd.toISOString(),
    });

    this.freezeEvent();
  }

  static from(persisted) {
    if (!persisted || !persisted.payload || !persisted.metadata) {
      throw new DomainInvariantError(
        "EventScheduled: Cannot rehydrate from incomplete data.",
      );
    }

    const { metadata, payload } = persisted;

    if (
      !metadata.aggregateId ||
      metadata.aggregateId !== payload.eventId
    ) {
      throw new DomainInvariantError(
        "EventScheduled: aggregateId mismatch during rehydration.",
      );
    }

    if (!metadata.occurredAt) {
      throw new DomainInvariantError(
        "EventScheduled: Historical occurredAt is required.",
      );
    }

    return new EventScheduled({
      eventId: payload.eventId,
      title: payload.title,
      roomId: payload.roomId,
      startTime: payload.startTime,
      endTime: payload.endTime,
      occurredAt: metadata.occurredAt,
      correlationId: metadata.correlationId,
      causationId: metadata.causationId,
      eventInstanceId: metadata.eventId,
    });
  }
}
