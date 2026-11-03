// src/shared/infrastructure/outbox/OutboxDispatcher.js

/**
 * Contract for dispatching outbox events to an external transport.
 *
 * Implementations may publish to:
 * - Kafka
 * - RabbitMQ
 * - AWS SNS/SQS
 * - Azure Service Bus
 * - Google Pub/Sub
 *
 * The OutboxWorker depends only on this abstraction,
 * not on any specific messaging technology.
 */
export class OutboxDispatcher {
  /**
   * Dispatch a single outbox event.
   *
   * @param {Object} event
   * @returns {Promise<void>}
   */
  async dispatch(event) {
    throw new Error(
      `${this.constructor.name} must implement dispatch(event).`
    );
  }
}