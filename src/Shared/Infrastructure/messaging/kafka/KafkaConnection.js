/**
 * @file src/shared/infrastructure/messaging/kafka/KafkaConnection.js
 * @description Shared Kafka client lifecycle.
 */

import {
    Kafka,
    logLevel,
} from "kafkajs";

export class KafkaConnection {

    constructor({
        brokers,
        clientId = "conference-management",
        ssl,
        sasl,
        logger = console,
        retry = {},
    }) {

        if (!brokers) {
            throw new Error(
                "KafkaConnection requires broker(s)."
            );
        }

        this.logger = logger;

        this.kafka = new Kafka({

            clientId,

            brokers:
                Array.isArray(brokers)
                    ? brokers
                    : brokers
                        .split(",")
                        .map(b => b.trim()),

            ssl,

            sasl,

            retry: {

                initialRetryTime: 300,

                retries: Number.MAX_SAFE_INTEGER,

                factor: 0.2,

                multiplier: 2,

                maxRetryTime: 30000,

                ...retry,

            },

            logLevel: logLevel.WARN,

            logCreator: () => ({ level, log }) => {

                const {
                    message,
                    ...meta
                } = log;

                switch (level) {

                    case logLevel.ERROR:
                        this.logger.error?.(
                            meta,
                            `[KafkaJS] ${message}`,
                        );
                        break;

                    case logLevel.WARN:
                        this.logger.warn?.(
                            meta,
                            `[KafkaJS] ${message}`,
                        );
                        break;

                    case logLevel.INFO:
                        this.logger.info?.(
                            meta,
                            `[KafkaJS] ${message}`,
                        );
                        break;

                    default:
                        this.logger.debug?.(
                            meta,
                            `[KafkaJS] ${message}`,
                        );

                }

            },

        });

        this.admin = null;

        this.adminConnected = false;

    }

    /**
     * Shared KafkaJS client.
     */
    getKafkaInstance() {

        return this.kafka;

    }

    async initialize() {

        if (this.adminConnected) {
            return;
        }

        this.admin = this.kafka.admin();

        await this.admin.connect();

        this.adminConnected = true;

        this.logger.info?.(
            "Kafka admin connected."
        );

    }

    async shutdown() {

        if (!this.adminConnected) {
            return;
        }

        await this.admin.disconnect();

        this.admin = null;

        this.adminConnected = false;

        this.logger.info?.(
            "Kafka admin disconnected."
        );

    }

    async checkHealth() {

        try {

            if (!this.adminConnected) {

                await this.initialize();

            }

            await this.admin.fetchTopicMetadata({
                topics: [],
            });

            return true;

        } catch (error) {

            this.logger.error?.(
                { error },
                "Kafka health check failed."
            );

            return false;

        }

    }

}