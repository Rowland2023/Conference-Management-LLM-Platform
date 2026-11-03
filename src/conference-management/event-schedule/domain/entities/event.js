import { randomUUID } from "node:crypto";
import { Entity } from "../../../../Shared/domain/Entity.js";
import { DomainInvariantError } from "../../../../Shared/domain/error/DomainErrors.js";
import { EventScheduled } from "../events/EventScheduled.js";
import { EventCancelled } from "../events/EventCancelled.js";
import { EventRescheduled } from "../events/EventRescheduled.js";

export const EVENT_STATUS = Object.freeze({
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "InProgress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
});

function parseDate(value, fieldName, messagePrefix = "Invalid") {
  const parsed = new Date(value);

  if (value === null || value === undefined || Number.isNaN(parsed.getTime())) {
    throw new DomainInvariantError(`${messagePrefix} ${fieldName}`);
  }

  return parsed;
}

function requireActor(actor, fieldName) {
  if (typeof actor !== "string" || !actor.trim()) {
    throw new DomainInvariantError(`${fieldName} is required`);
  }

  return actor.trim();
}

export class Event extends Entity {
  constructor({
    id = randomUUID(),
    title,
    roomID,
    organizerId,
    startTime,
    endTime,
    status = EVENT_STATUS.DRAFT,
    version = 0,
  }) {
    super(id, version);

    this.title = title;
    this.roomID = roomID;
    this.organizerId = organizerId;
    this.startTime = startTime;
    this.endTime = endTime;
    this.status = status;
  }

  static create(
    { title, roomID, organizerId, startTime, endTime },
    { correlationId = null, causationId = null } = {},
  ) {
    if (typeof title !== "string" || !title.trim()) {
      throw new DomainInvariantError("Event title is required");
    }

    if (typeof roomID !== "string" || !roomID.trim()) {
      throw new DomainInvariantError("Room ID is required");
    }

    if (typeof organizerId !== "string" || !organizerId.trim()) {
      throw new DomainInvariantError("Organizer ID is required");
    }

    const parsedStart = parseDate(startTime, "startTime");
    const parsedEnd = parseDate(endTime, "endTime");

    if (parsedStart >= parsedEnd) {
      throw new DomainInvariantError("Start must be before end");
    }

    if (parsedStart <= new Date()) {
      throw new DomainInvariantError("Cannot schedule in the past");
    }

    const event = new Event({
      id: randomUUID(),
      title: title.trim(),
      roomID: roomID.trim(),
      organizerId: organizerId.trim(),
      startTime: parsedStart.toISOString(),
      endTime: parsedEnd.toISOString(),
      status: EVENT_STATUS.SCHEDULED,
      version: 0,
    });

    event.recordEvent(
      new EventScheduled({
        eventId: event.id,
        title: event.title,
        roomId: event.roomID,
        startTime: event.startTime,
        endTime: event.endTime,
        occurredAt: new Date(),
        correlationId,
        causationId,
      }),
    );

    return event;
  }

  static fromPersistence(dbDoc) {
    if (!dbDoc) return null;

    const startValue = dbDoc.start_time ?? dbDoc.startTime;
    const endValue = dbDoc.end_time ?? dbDoc.endTime;

    const parsedStart = parseDate(startValue, "start time", "invalid");
    const parsedEnd = parseDate(endValue, "end time");

    if (parsedStart >= parsedEnd) {
      throw new DomainInvariantError(
        `Corrupt event ${dbDoc.id}: start time cannot be equal to or after end time.`,
      );
    }

    const version = Number(dbDoc.version ?? 0);

    if (!Number.isInteger(version) || version < 0) {
      throw new DomainInvariantError(
        "Persisted event version must be a non-negative integer.",
      );
    }

    return new Event({
      id: dbDoc.id,
      title: dbDoc.title,
      roomID: dbDoc.room_id ?? dbDoc.roomID,
      organizerId: dbDoc.organizer_id ?? dbDoc.organizerId,
      startTime: parsedStart.toISOString(),
      endTime: parsedEnd.toISOString(),
      status: dbDoc.status,
      version,
    });
  }

  cancel(
    reason = null,
    { cancelledBy, correlationId = null, causationId = null } = {},
  ) {
    if (this.status === EVENT_STATUS.CANCELLED) {
      throw new DomainInvariantError("Event is already cancelled");
    }

    const actor = requireActor(cancelledBy, "cancelledBy");

    if (new Date(this.startTime) <= new Date()) {
      throw new DomainInvariantError(
        "Cannot cancel past or in-progress events",
      );
    }

    // Construct the event before mutating aggregate state.
    const domainEvent = new EventCancelled({
      eventId: this.id,
      cancelledBy: actor,
      reason: reason || "Administrative cancellation",
      occurredAt: new Date(),
      correlationId,
      causationId,
    });

    this.status = EVENT_STATUS.CANCELLED;
    this.incrementVersion();
    this.recordEvent(domainEvent);

    return this;
  }

  reschedule(
    { startTime, endTime },
    {
      rescheduledBy,
      reason = "user_request",
      correlationId = null,
      causationId = null,
    } = {},
  ) {
    if (this.status === EVENT_STATUS.CANCELLED) {
      throw new DomainInvariantError("Cannot reschedule a cancelled event");
    }

    const actor = requireActor(rescheduledBy, "rescheduledBy");
    const parsedNewStart = parseDate(startTime, "new startTime");
    const parsedNewEnd = parseDate(endTime, "new endTime");

    if (parsedNewStart >= parsedNewEnd) {
      throw new DomainInvariantError(
        "New startTime must be before new endTime",
      );
    }

    if (parsedNewStart <= new Date()) {
      throw new DomainInvariantError(
        "Cannot reschedule an event into the past",
      );
    }

    const previousStartTime = this.startTime;
    const previousEndTime = this.endTime;
    const normalizedStart = parsedNewStart.toISOString();
    const normalizedEnd = parsedNewEnd.toISOString();

    // Construct the event before mutating aggregate state.
    const domainEvent = new EventRescheduled({
      eventId: this.id,
      previousStartTime,
      previousEndTime,
      newStartTime: normalizedStart,
      newEndTime: normalizedEnd,
      rescheduledBy: actor,
      reason,
      occurredAt: new Date(),
      correlationId,
      causationId,
    });

    this.startTime = normalizedStart;
    this.endTime = normalizedEnd;
    this.incrementVersion();
    this.recordEvent(domainEvent);

    return this;
  }
}
