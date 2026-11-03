// src/modules/registration/domain/events/RegistrationCancelledEvent.js

import { DomainEvent } from "../../../../shared/domain/DomainEvent.js"; // Adjust relative path as needed
import { DomainInvariantError } from "../../../../shared/domain/error/DomainErrors.js";

/**
 * Domain Event fired immediately after an existing registration aggregate 
 * transitions successfully into the 'cancelled' state.
 * Pure Immutable Domain Event.
 */
export class RegistrationCancelledEvent extends DomainEvent {
  /**
   * @param {Object} data
   * @param {string} data.registrationId - Unique identifier of the cancelled registration
   * @param {string} data.conferenceId - Associated conference identifier
   * @param {string} data.userId - Associated attendee user identifier
   * @param {string} [data.reason] - Optional cancellation reason context
   * @param {string|null} [data.correlationId=null] - Distributed tracing token
   * @param {string|null} [data.causationId=null] - Causal trace origin token
   * @param {Date|string} [data.occurredAt] - Explicit creation date hook
   */
  constructor({
    registrationId,
    conferenceId,
    userId,
    reason = "User requested cancellation",
    correlationId = null,
    causationId = null,
    occurredAt = new Date()
  }) {
    // 1. Assert structural mandatory presence
    if (!registrationId) {
      throw new DomainInvariantError("RegistrationCancelledEvent: missing parameter [registrationId].");
    }
    if (!conferenceId) {
      throw new DomainInvariantError("RegistrationCancelledEvent: missing parameter [conferenceId].");
    }
    if (!userId) {
      throw new DomainInvariantError("RegistrationCancelledEvent: missing parameter [userId].");
    }

    const parsedOccurred = occurredAt instanceof Date ? occurredAt : new Date(occurredAt);
    if (Number.isNaN(parsedOccurred.getTime())) {
      throw new DomainInvariantError("RegistrationCancelledEvent: Invalid occurredAt timestamp provided.");
    }

    const normalizedReason = typeof reason === "string" && reason.trim() !== "" 
      ? reason.trim() 
      : "User requested cancellation";

    // 2. Delegate Envelope, Identity, and Tracing Metadata to Parent Base Class
    super({
      eventName: "registration.cancelled",
      eventVersion: 1,
      aggregateId: registrationId,
      occurredAt: parsedOccurred,
      correlationId,
      causationId
    });

    // 3. Formulate Pure Domain Event Payload
    this.payload = {
      registrationId,
      conferenceId,
      userId,
      reason: normalizedReason
    };

    // 4. Single atomic top-down deep freeze pass handled by base class utility
    this.freezeEvent();
  }

  /**
   * Standard contract serializer method.
   * Maps internal structures to raw JSON structures for the outbox table or brokers.
   * 
   * @returns {Object}
   */
  toJSON() {
    return {
      eventName: this.metadata.eventName,
      version: this.metadata.eventVersion,
      metadata: this.metadata,
      payload: this.payload
    };
  }

  /**
   * Static Rehydration Factory Engine.
   * Reconstructs historical instances out of saved infrastructure logs without side effects.
   * 
   * @param {Object} json - Document map pulled out of the infrastructure database.
   * @returns {RegistrationCancelledEvent}
   */
  static fromJSON(json) {
    if (!json || !json.payload) {
      throw new DomainInvariantError("RegistrationCancelledEvent: Cannot rehydrate event from an empty payload structure.");
    }

    const metadata = json.metadata || {};
    const extractedRegistrationId = json.aggregateId || metadata.aggregateId || json.payload.registrationId;

    return new RegistrationCancelledEvent({
      registrationId: extractedRegistrationId,
      conferenceId: json.payload.conferenceId,
      userId: json.payload.userId,
      reason: json.payload.reason,
      correlationId: json.correlationId || metadata.correlationId,
      causationId: json.causationId || metadata.causationId,
      occurredAt: json.occurredAt || metadata.occurredAt
    });
  }
}