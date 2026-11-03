
// src/boostrap/infrastructure.js

import Redis from "ioredis";
import axios from "axios";

import { KafkaConnection }
    from "../shared/infrastructure/messaging/kafka/KafkaConnection.js";

import { KafkaEventBus }
    from "../shared/infrastructure/messaging/kafka/KafkaEventBus.js";

import { OutboxWorker }
    from "../shared/infrastructure/messaging/outbox/OutboxWorker.js";

import { PostgresOutboxRepository }
    from "../shared/infrastructure/messaging/outbox/PostgresOutboxRepository.js";

import KnexUnitOfWork
    from "../cross-cutting/database/KnexUnitOfWork.js";

import { registerLockCommands }
    from "../shared/infrastructure/redis/registerLockCommands.js";


export function bootstrapInfrastructure({
    db,
    config,
    logger,
}) {

    // ======================================================
    // HTTP Client
    // ======================================================

    const httpClient = axios.create({
        baseURL: "https://api.paystack.co",
        timeout: 15000,
        headers: {
            "Content-Type": "application/json",
        },
    });


    // ======================================================
    // Redis
    // ======================================================

    const redis = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,

        lazyConnect: false,

        maxRetriesPerRequest: 1,

        retryStrategy(times) {
            const delay = Math.min(times * 1000, 5000);

            logger.warn(
                {
                    attempt: times,
                    delay,
                },
                "Redis reconnect attempt."
            );

            if (times >= 5) {
                logger.error(
                    "Redis unavailable. Giving up reconnect attempts."
                );

                return null;
            }

            return delay;
        },
    });


    redis.on("connect", () => {
        logger.info("Redis connected.");
    });

    redis.on("ready", () => {
        logger.info("Redis ready.");
    });

    redis.on("error", (err) => {
        logger.warn(
            {
                error: err.message,
            },
            "Redis connection error."
        );
    });

    redis.on("close", () => {
        logger.warn("Redis connection closed.");
    });

    redis.on("end", () => {
        logger.warn("Redis client disconnected.");
    });


    registerLockCommands(redis);


    // ======================================================
    // Kafka
    // ======================================================

    const kafkaConnection = new KafkaConnection({
        clientId: config.kafka.clientId,
        brokers: config.kafka.brokers,
        logger,
    });

    const eventBus = new KafkaEventBus({
        kafkaConnection,
        groupId: config.kafka.groupId,
        logger,
    });


    // ======================================================
    // Database
    // ======================================================

    const unitOfWorkFactory = () =>
        new KnexUnitOfWork({
            knex: db,
        });


    // ======================================================
    // Outbox
    // ======================================================

    const outboxRepository = new PostgresOutboxRepository({
        db,
    });

    const outboxWorker = new OutboxWorker({
        outboxRepository,
        eventBus,
        logger,
    });


    // ======================================================
    // Shared Infrastructure
    // ======================================================

    return {
        db,
        redis,
        config,
        httpClient,
        unitOfWorkFactory,
        kafkaConnection,
        eventBus,
        outboxRepository,
        outboxWorker,
        logger,
    };
}
