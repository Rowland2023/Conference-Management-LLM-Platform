// src/shared/infrastructure/messaging/kafka/KafkaProducer.js

import {
    CompressionTypes,
    Partitioners,
} from "kafkajs";

export class KafkaProducer {

    constructor({
        kafka,
        logger = console,
        config = {},
    }) {

        if (!kafka) {
            throw new Error(
                "KafkaProducer requires a Kafka instance."
            );
        }

        this.logger = logger;

        this.kafka = kafka;

        this.instrumentationEmitter =
            kafka.instrumentationEmitter;

        this.producer =
            kafka.producer({

                allowAutoTopicCreation: false,

                idempotent: true,

                maxInFlightRequests: 1,

                createPartitioner:
                    Partitioners.LegacyPartitioner,

                transactionTimeout: 30000,

                ...config,

            });

        this.isConnected = false;

        this.isReconnecting = false;

        this.isShuttingDown = false;

        this.reconnectTimeout = null;

        this.eventsRegistered = false;

        this.handleDisconnect =
            this.handleDisconnect.bind(this);

        this.handleCrash =
            this.handleCrash.bind(this);

    }

    async connect() {

        if (this.isConnected) {
            return;
        }

        await this.producer.connect();

        this.isConnected = true;

        this.isShuttingDown = false;

        this.isReconnecting = false;

        this.registerInstrumentationEvents();

        this.logger.info?.(
            "Kafka producer connected."
        );

    }

    registerInstrumentationEvents() {

        if (
            this.eventsRegistered ||
            !this.instrumentationEmitter
        ) {
            return;
        }

        this.eventsRegistered = true;

        this.instrumentationEmitter.on(
            "producer.disconnect",
            this.handleDisconnect,
        );

        this.instrumentationEmitter.on(
            "producer.crash",
            this.handleCrash,
        );

    }

    handleDisconnect(event) {

        this.isConnected = false;

        this.logger.warn?.(
            { event },
            "Kafka producer disconnected."
        );

    }

    async handleCrash({ payload }) {

        this.isConnected = false;

        this.logger.error?.(
            { error: payload.error },
            "Kafka producer crashed."
        );

        this.scheduleReconnect();

    }

    scheduleReconnect() {

        if (
            this.isReconnecting ||
            this.isShuttingDown
        ) {
            return;
        }

        this.isReconnecting = true;

        clearTimeout(
            this.reconnectTimeout
        );

        this.reconnectTimeout =
            setTimeout(
                () => this.reconnect(),
                5000,
            );

    }

    async reconnect() {

        try {

            await this.connect();

            this.logger.info?.(
                "Kafka producer recovered."
            );

        } catch (err) {

            this.logger.error?.(
                { err },
                "Kafka producer recovery failed."
            );

            this.isReconnecting = false;

            this.scheduleReconnect();

            return;

        }

        this.isReconnecting = false;

    }

    async publish(
        topic,
        messages,
    ) {

        if (!this.isConnected) {

            throw new Error(
                "KafkaProducer is not connected."
            );

        }

        if (!topic) {

            throw new Error(
                "KafkaProducer.publish requires a topic."
            );

        }

        if (
            !Array.isArray(messages) ||
            messages.length === 0
        ) {

            throw new Error(
                "KafkaProducer.publish requires at least one message."
            );

        }

        await this.producer.send({

            topic,

            compression:
                CompressionTypes.GZIP,

            messages:
                messages.map((message) => ({

                    key:
                        message.key != null
                            ? String(message.key)
                            : undefined,

                    value:
                        typeof message.value === "string"
                            ? message.value
                            : JSON.stringify(
                                message.value
                            ),

                    headers:
                        message.headers,

                })),

        });

    }

    async disconnect() {

        this.isShuttingDown = true;

        clearTimeout(
            this.reconnectTimeout
        );

        this.reconnectTimeout = null;

        if (!this.isConnected) {
            return;
        }

        await this.producer.disconnect();

        this.isConnected = false;

        this.isReconnecting = false;

        this.logger.info?.(
            "Kafka producer disconnected."
        );

    }

}