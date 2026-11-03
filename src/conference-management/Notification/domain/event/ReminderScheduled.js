import { DomainEvent } from "../../../../shared/domain/DomainEvent.js";
import { ValidationError }
from "../../../../shared/application/errors/ApplicationErrors.js";

export class ReminderScheduled extends DomainEvent {
  constructor({ 
    notificationId, 
    contextType, // 'conference', 'payment', 'escrow'
    contextId,
    userId, 
    scheduledFor,
    templateKey, // 'funds_released_t+1d', 'escrow_timeout_warning'
    decidedAt, // required: when the decision was made
    correlationId = null, 
    causationId = null,
  }) {
    if (!notificationId) throw new ValidationError("ReminderScheduled: notificationId is required.");
    if (!contextType) throw new ValidationError("ReminderScheduled: contextType is required.");
    if (!contextId) throw new ValidationError("ReminderScheduled: contextId is required.");
    if (!userId) throw new ValidationError("ReminderScheduled: userId is required.");
    if (!scheduledFor) throw new ValidationError("ReminderScheduled: scheduledFor is required.");
    if (!templateKey) throw new ValidationError("ReminderScheduled: templateKey is required.");
    if (!decidedAt) throw new ValidationError("ReminderScheduled: decidedAt is required.");

    const schedDate = new Date(scheduledFor);
    if (Number.isNaN(schedDate.getTime())) {
      throw new ValidationError("ReminderScheduled: scheduledFor must be valid date.");
    }
    
    const decidedAtDate = new Date(decidedAt);
    if (Number.isNaN(decidedAtDate.getTime())) {
      throw new ValidationError("ReminderScheduled: decidedAt must be valid date.");
    }

    // Don't validate scheduledFor > decidedAt here. That's a command/aggregate rule.
    // Events record what happened, even if it was a bad decision.

    super({
      eventName: "reminder.scheduled",
      eventVersion: 1,
      aggregateId: notificationId,
      occurredAt: decidedAtDate, // decision time, not processing time
      correlationId,
      causationId
    });

    this.payload = Object.freeze({
      notificationId,
      contextType,
      contextId,
      userId,
      scheduledFor: schedDate.toISOString(),
      templateKey
    });

    this.freezeEvent();
  }

  static from(persisted) {
    return new ReminderScheduled({
      ...persisted.payload,
      decidedAt: persisted.metadata.occurredAt,
      correlationId: persisted.metadata.correlationId,
      causationId: persisted.metadata.causationId
    });
  }
}