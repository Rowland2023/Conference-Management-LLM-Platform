import { randomUUID } from 'crypto';

export class DomainEvent {
  /**
   * @param {Object} params
   * @param {string} params.eventName - E.g., 'payment.initialized'
   * @param {string} params.aggregateId - The target aggregate UUID (Crucial for outbox/Kafka grouping)
   * @param {number} [params.eventVersion=1] - Incremental version for schema evolution
   * @param {string} [params.eventId] - Unique identifier for this event instance
   * @param {Date} [params.occurredAt] - Timestamp when the event actually happened
   * @param {string|null} [params.correlationId=null] - ID to trace the casual chain across modules
   * @param {string|null} [params.causationId=null] - ID of the message/request that triggered this event
   */
  constructor({
    eventName,
    aggregateId,
    eventVersion = 1,
    eventId = randomUUID(),
    occurredAt = new Date(),
    correlationId = null,
    causationId = null
  }) {
    if (!eventName || typeof eventName !== 'string') {
      throw new Error('DomainEvent requires a string eventName');
    }
    if (!aggregateId || typeof aggregateId !== 'string') {
      throw new Error('DomainEvent requires a string aggregateId');
    }
    if (typeof eventVersion !== 'number' || eventVersion < 1) {
      throw new Error('eventVersion must be a positive integer');
    }
    if (!(occurredAt instanceof Date) || isNaN(occurredAt.getTime())) {
      throw new Error('occurredAt must be a valid Date');
    }

    this.metadata = Object.freeze({
      eventId,
      eventName,
      aggregateId,
      eventVersion,
      occurredAt: occurredAt.toISOString(), 
      correlationId: correlationId ?? null,
      causationId: causationId ?? null
    });
  }

  /**
   * Safe utility method for subclasses to call at the end of their constructor
   * to guarantee deep immutability across the entire event payload graph.
   */
  freezeEvent() {
    const deepFreeze = (obj) => {
      Object.freeze(obj);
      Object.keys(obj).forEach((prop) => {
        if (
          obj[prop] !== null &&
          (typeof obj[prop] === 'object' || typeof obj[prop] === 'function') &&
          !Object.isFrozen(obj[prop])
        ) {
          deepFreeze(obj[prop]);
        }
      });
    };
    deepFreeze(this);
    return this;
  }
}