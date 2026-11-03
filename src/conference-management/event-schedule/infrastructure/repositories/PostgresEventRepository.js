
import { ConcurrencyConflictError } from "../../../../Shared/application/errors/ApplicationErrors.js";
import { Event } from "../../domain/entities/event.js";

export class PostgresEventRepository {
    constructor({ db }) {
        if (!db || typeof db !== "function") {
            throw new TypeError(
                "PostgresEventRepository requires a Knex instance."
            );
        }

        this.db = db;
        this.table = "events";
    }

    toReadModel(row) {
        if (!row) return null;

        return {
            id: row.id,
            title: row.title,
            roomId: row.room_id,
            organizerId: row.organizer_id,
            startTime: row.start_time instanceof Date
                ? row.start_time.toISOString()
                : row.start_time,
            endTime: row.end_time instanceof Date
                ? row.end_time.toISOString()
                : row.end_time,
            status: row.status,
            version: Number(row.version ?? 0),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    /**
     * Persist a new or previously loaded Event aggregate.
     *
     * The caller supplies the transaction when participating in a
     * larger unit of work.
     */
    async save(event, trx = this.db) {
        if (!event?.id) {
            throw new TypeError("A valid Event aggregate is required.");
        }

        const values = {
            title: event.title,
            room_id: event.roomID,
            organizer_id: event.organizerId,
            start_time: event.startTime,
            end_time: event.endTime,
            status: event.status,
            version: event.version,
        };

        if (event.version === 0) {
            await trx(this.table).insert({
                id: event.id,
                ...values,
            });

            return;
        }

        const updatedRows = await trx(this.table)
            .where({
                id: event.id,
                version: event.version - 1,
            })
            .update({
                ...values,
                updated_at: trx.fn.now(),
            })
            .returning("id");

        if (!updatedRows || updatedRows.length === 0) {
            throw new ConcurrencyConflictError(
                `Event ${event.id} was modified by another process.`
            );
        }
    }

    /**
     * Load and rehydrate an Event aggregate.
     */
    async findById(id, trx = this.db) {
        const row = await trx(this.table)
            .where({ id })
            .first();

        return Event.fromPersistence(row);
    }

    /**
     * Load an aggregate while holding a PostgreSQL row lock.
     */
    async findByIdForUpdate(id, trx) {
        if (!trx) {
            throw new TypeError(
                "An active transaction is required for findByIdForUpdate()."
            );
        }

        const row = await trx(this.table)
            .where({ id })
            .forUpdate()
            .first();

        return Event.fromPersistence(row);
    }

    /**
     * Serialize scheduling attempts for the same room.
     *
     * PostgreSQL 10+ supports hashtextextended().
     * The lock is automatically released when the transaction ends.
     */
    async lockRoomForScheduling(roomId, trx) {
        if (!trx) {
            throw new TypeError(
                "An active transaction is required to lock a room."
            );
        }

        await trx.raw(
            "SELECT pg_advisory_xact_lock(hashtextextended(?, 0))",
            [roomId]
        );
    }

    /**
     * Check for an existing event whose time window overlaps the
     * requested window. Cancelled events do not reserve a room.
     */
    async existsOverlappingEvent(
        roomId,
        startTime,
        endTime,
        excludeId = null,
        trx = this.db
    ) {
        let query = trx(this.table)
            .select("id")
            .where("room_id", roomId)
            .whereNot("status", "Cancelled")
            .where("start_time", "<", endTime)
            .where("end_time", ">", startTime);

        if (excludeId) {
            query = query.whereNot("id", excludeId);
        }

        const conflict = await query.first();

        return Boolean(conflict);
    }

    /**
     * Execute a callback inside a managed database transaction.
     */
    async transaction(callback) {
        if (typeof callback !== "function") {
            throw new TypeError(
                "A transaction callback function is required."
            );
        }

        return this.db.transaction(callback);
    }

    /**
     * List events as read models, not domain aggregates.
     */
    async findAll(filters = {}, trx = this.db) {
        const page = Math.max(1, Number(filters.page) || 1);
        const limit = Math.min(
            100,
            Math.max(1, Number(filters.limit) || 20)
        );

        let query = trx(this.table).select("*");

        if (filters.roomId) {
            query = query.where("room_id", filters.roomId);
        }

        if (filters.organizerId) {
            query = query.where("organizer_id", filters.organizerId);
        }

        if (filters.status) {
            query = query.where("status", filters.status);
        }

        const rows = await query
            .orderBy("start_time", "asc")
            .limit(limit)
            .offset((page - 1) * limit);

        return rows.map((row) => this.toReadModel(row));
    }
}
