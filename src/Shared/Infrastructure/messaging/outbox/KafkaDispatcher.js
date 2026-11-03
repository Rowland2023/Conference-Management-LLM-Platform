// src/shared/infrastructure/outbox/KafkaDispatcher.js

import { OutboxDispatcher } from "./OutboxDispatcher.js";

/**
 * Kafka implementation of the OutboxDispatcher.
 *
 * Converts persisted outbox events into Kafka messages.
 * The OutboxWorker depends only on OutboxDispatcher,
 * allowing Kafka to be replaced without changing worker logic.
 */
export class KafkaDispatcher extends OutboxDispatcher {
  /**
   * @param {Object} params
   * @param {KafkaProducer} params.kafkaProducer
   * @param {Object} params.topicResolver
   */
  constructor({ kafkaProducer, topicResolver }) {
    super();

    if (!kafkaProducer) {
      throw new Error(
        "KafkaDispatcher requires a KafkaProducer."
      );
    }

    if (!topicResolver) {
      throw new Error(
        "KafkaDispatcher requires a topicResolver."
      );
    }

    this.kafkaProducer = kafkaProducer;
    this.topicResolver = topicResolver;
  }

  /**
   * Publish one outbox event to Kafka.
   *
   * @param {Object} event
   */
  async dispatch(event) {
    if (!event) {
      throw new Error("Outbox event is required.");
    }

    const topic = this.topicResolver.resolve(
      event.eventName
    );

    if (!topic) {
      throw new Error(
        `No Kafka topic configured for event '${event.eventName}'.`
      );
    }

    await this.kafkaProducer.publish({
      topic,

      key: event.aggregateId,

      value: {
        metadata: {
          eventId: event.id,
          eventName: event.eventName,
          aggregateId: event.aggregateId,
          aggregateType: event.aggregateType,
          eventVersion: event.eventVersion,
          occurredAt: event.occurredAt,
          correlationId: event.correlationId,
          causationId: event.causationId
        },

        payload: event.payload
      }
    });
  }
}