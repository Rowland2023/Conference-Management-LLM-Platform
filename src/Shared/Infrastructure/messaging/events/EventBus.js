/**
 * @interface
 */
export class EventBus {
  /**
   * Publishes a single domain event to the message bus.
   * @abstract
   * @param {import('../../../shared/domain/DomainEvent.js').DomainEvent} event 
   * @returns {Promise<void>}
   */
  async publish(event) {
    throw new Error('Method publish() must be implemented by Infrastructure layer.');
  }

  /**
   * Publishes multiple domain events atomically if supported by the broker.
   * Default implementation publishes sequentially.
   * @abstract
   * @param {import('../../../shared/domain/DomainEvent.js').DomainEvent[]} events 
   * @returns {Promise<void>}
   */
  async publishBatch(events) {
    for (const event of events) {
      await this.publish(event);
    }
  }

  /**
   * Subscribes to domain events by name. Returns unsubscribe function.
   * @abstract
   * @param {string} eventName 
   * @param {function(import('../../../shared/domain/DomainEvent.js').DomainEvent): Promise<void>} handler 
   * @returns {() => void} Unsubscribe function
   */
  subscribe(eventName, handler) {
    throw new Error('Method subscribe() must be implemented by Infrastructure layer.');
  }
}