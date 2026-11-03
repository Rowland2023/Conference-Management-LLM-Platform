/**
 * @file src/shared/infrastructure/messaging/outbox/PostgresOutboxRepository.js
 * @description Transactional Outbox Repository (Knex Implementation)
 */

export class PostgresOutboxRepository {

    /**
     * @param {Object} params
     * @param {import("knex").Knex} params.db
     */
    constructor({ db }) {

        if (!db) {
            throw new Error(
                "PostgresOutboxRepository requires a Knex instance."
            );
        }

        this.db = db;
        this.table = "outbox_events";

    }

    /**
     * Persist one or more domain events.
     *
     * IMPORTANT:
     * Must execute inside the same transaction
     * as the aggregate persistence.
     */
    async save(events, trx = this.db) {

        const items = Array.isArray(events)
            ? events
            : [events];

        const rows = items.map((event) => {

            const metadata = event.metadata ?? {};

            return {

                id: metadata.eventId,

                aggregate_type:
                    event.aggregateType ??
                    metadata.aggregateType ??
                    event.constructor.name,

                aggregate_id:
                    metadata.aggregateId,

                event_type:
                    metadata.eventName,

                payload:
                    JSON.stringify(event.payload),

                status: "PENDING",

                retry_count: 0,

                max_retries: 5,

                next_retry_at: trx.fn.now(),

                correlation_id:
                    metadata.correlationId ?? null,

                created_at:
                    metadata.occurredAt ?? trx.fn.now(),

            };

        });

        await trx(this.table).insert(rows);

    }

    /**
     * Fetch pending events and lock them.
     */
    async fetchAndLockPending(
        batchSize = 100,
        maxRetries = 5,
    ) {

        return this.db.transaction(async (trx) => {

            const rows = await trx(this.table)
                .where("status", "PENDING")
                .where("retry_count", "<", maxRetries)
                .where("next_retry_at", "<=", trx.fn.now())
                .orderBy("created_at", "asc")
                .limit(batchSize)
                .forUpdate()
                .skipLocked();

            if (rows.length === 0) {
                return [];
            }

            await trx(this.table)
                .whereIn(
                    "id",
                    rows.map((row) => row.id),
                )
                .update({
                    status: "PROCESSING",
                });

            return rows;

        });

    }

    /**
     * Mark event successfully dispatched.
     */
    async markAsDispatched(id) {

        await this.db(this.table)
            .where({ id })
            .update({

                status: "PROCESSED",

                processed_at: this.db.fn.now(),

            });

    }

    /**
     * Increment retry counter.
     */
    async incrementRetry(
        id,
        errorMessage,
    ) {

        await this.db(this.table)
            .where({ id })
            .increment("retry_count", 1)
            .update({

                status: "PENDING",

                last_error: errorMessage,

                next_retry_at: this.db.raw(
                    "NOW() + INTERVAL '30 seconds'"
                ),

            });

    }

    /**
     * Mark event permanently failed.
     */
    async markAsFailed(
        id,
        errorMessage,
    ) {

        await this.db(this.table)
            .where({ id })
            .update({

                status: "FAILED",

                last_error: errorMessage,

                processed_at: this.db.fn.now(),

            });

    }

}