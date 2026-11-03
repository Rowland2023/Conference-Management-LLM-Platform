// src/modules/Event Schedule/domain/entities/event.entities.js

import { Entity } from "../../../../shared/domain/entity.js";
import { DomainInvariantError } from "../../../../shared/domain/error/DomainErrors.js";
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

export class Event extends Entity {
  constructor({
    id,
    title,
    roomID,
    organizerId, // who owns this
    startTime, // ISO string, always UTC
    endTime,   // ISO string, always UTC
    status = EVENT_STATUS.DRAFT,
    version = 0, // for optimistic locking
  }) {
    super(id);
    this.title = title;
    this.roomID = roomID;
    this.organizerId = organizerId;
    this.startTime = startTime; // store as ISO string
    this.endTime = endTime;     // store as ISO string  
    this.status = status;
    this.version = version;
  }

  static create({ title, roomID, organizerId, startTime, endTime }, { correlationId = null } = {}) {
    if (!title?.trim()) throw new DomainInvariantError("Event title is required.");
    if (!roomID) throw new DomainInvariantError("Room ID is required.");
    if (!organizerId) throw new DomainInvariantError("Organizer ID is required.");
    
    const parsedStart = new Date(startTime);
    const parsedEnd = new Date(endTime);
    const now = new Date();

    if (Number.isNaN(parsedStart.getTime())) throw new DomainInvariantError("Invalid startTime.");
    if (Number.isNaN(parsedEnd.getTime())) throw new DomainInvariantError("Invalid endTime.");
    if (parsedStart >= parsedEnd) throw new DomainInvariantError("Start must be before end.");
    if (parsedStart <= now) throw new DomainInvariantError("Cannot schedule in the past.");

    const event = new Event({ 
      title: title.trim(), 
      roomID, 
      organizerId,
      startTime: parsedStart.toISOString(),
      endTime: parsedEnd.toISOString(),
      status: EVENT_STATUS.SCHEDULED,
      version: 0
    });

    event.recordEvent(new EventScheduled({
      eventId: event.id,
      title: event.title,
      roomId: event.roomID,
      organizerId: event.organizerId,
      startTime: event.startTime,
      endTime: event.endTime,
      correlationId
    }));

    return event;
  }

  static fromPersistence(dbDoc) {
    if (!dbDoc) return null;
    
    // Trust DB but still parse dates to validate integrity
    const start = new Date(dbDoc.startTime);
    const end = new Date(dbDoc.endTime);
    if (start >= end) {
      throw new DomainInvariantError(`Corrupt event ${dbDoc.id}: start time cannot be equal to or after end time.`);
    }
    
    return new Event({
      id: dbDoc.id,
      title: dbDoc.title,
      roomID: dbDoc.roomID,
      organizerId: dbDoc.organizerId,
      startTime: dbDoc.startTime, // keep as ISO string from DB
      endTime: dbDoc.endTime,
      status: dbDoc.status,
      version: dbDoc.version
    });
  }

  cancel(reason = null, { cancelledBy, correlationId = null, causationId = null } = {}) {
    if (this.status === EVENT_STATUS.CANCELLED) {
      throw new DomainInvariantError("Event is already cancelled.");
    }
    if (new Date(this.startTime) <= new Date()) {
      throw new DomainInvariantError("Cannot cancel past or in-progress events.");
    }
    if (!cancelledBy) {
      throw new DomainInvariantError("cancelledBy is required for audit.");
    }

    this.status = EVENT_STATUS.CANCELLED;
    this.version += 1;

    this.recordEvent(new EventCancelled({
      eventId: this.id,
      cancelledBy,
      reason: reason || "Administrative cancellation",
      correlationId,
      causationId
    }));
  }

  reschedule({ startTime, endTime }, { correlationId = null, causationId = null } = {}) {
    if (this.status === EVENT_STATUS.CANCELLED) {
      throw new DomainInvariantError("Cannot reschedule a cancelled event.");
    }

    const parsedNewStart = new Date(startTime);
    const parsedNewEnd = new Date(endTime);
    const now = new Date();

    if (Number.isNaN(parsedNewStart.getTime())) throw new DomainInvariantError("Invalid new startTime.");
    if (Number.isNaN(parsedNewEnd.getTime())) throw new DomainInvariantError("Invalid new endTime.");
    if (parsedNewStart >= parsedNewEnd) throw new DomainInvariantError("New startTime must be before new endTime.");
    if (parsedNewStart <= now) throw new DomainInvariantError("Cannot reschedule an event into the past.");

    const previousStartTime = this.startTime;
    const previousEndTime = this.endTime;

    this.startTime = parsedNewStart.toISOString();
    this.endTime = parsedNewEnd.toISOString();
    this.version += 1;

    this.recordEvent(new EventRescheduled({
      eventId: this.id,
      previousStartTime,
      previousEndTime,
      newStartTime: this.startTime,
      newEndTime: this.endTime,
      correlationId,
      causationId
    }));
  }
}