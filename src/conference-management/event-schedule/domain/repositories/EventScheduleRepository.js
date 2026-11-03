
import { ValidationError } from "../../../../Shared/application/errors/ApplicationErrors.js";

/**
 * Event Schedule Repository Contract.
 *
 * Defines the persistence operations required by the Event Schedule
 * domain and application layers.
 *
 * Infrastructure implementations (e.g. PostgreSQL, MongoDB, Prisma)
 * must extend this class and override every method.
 */
export class EventScheduleRepository {
    /**
     * Persist or update an Event aggregate instance.
     *
     * @param {Object} event - The Event aggregate instance.
     * @param {Object|null} [trx=null] - Optional database transaction context.
     * @returns {Promise<void>}
     */
    async save(event, trx = null) {
        if (!event) {
            throw new ValidationError(
                "EventScheduleRepository: An aggregate instance is required to execute save()."
            );
        }

        throw new Error(
            "EventScheduleRepository.save() must be implemented by the infrastructure layer."
        );
    }

    /**
     * Find an event by its unique identifier.
     *
     * @param {string} id - The unique ID of the event.
     * @returns {Promise<Object|null>} The mapped Event aggregate or null.
     */
    async findById(id) {
        if (!id || typeof id !== "string" || id.trim() === "") {
            throw new ValidationError(
                "EventScheduleRepository: A valid, non-empty string ID identifier is required for findById()."
            );
        }

        throw new Error(
            "EventScheduleRepository.findById() must be implemented by the infrastructure layer."
        );
    }

    /**
     * Load an event using a strict row-level write lock.
     * Crucial for concurrency control during direct event mutations.
     *
     * @param {string} id - The unique ID of the event.
     * @param {Object} trx - Active transaction context (mandatory for row locking).
     * @returns {Promise<Object|null>} The locked Event aggregate or null.
     */
    async findByIdForUpdate(id, trx) {
        if (!id || typeof id !== "string" || id.trim() === "") {
            throw new ValidationError(
                "EventScheduleRepository: A valid, non-empty string ID identifier is required for findByIdForUpdate()."
            );
        }

        if (!trx) {
            throw new ValidationError(
                "EventScheduleRepository: An active transaction boundary (trx) context is mandatory for row-level locking."
            );
        }

        throw new Error(
            "EventScheduleRepository.findByIdForUpdate() must be implemented by the infrastructure layer."
        );
    }

    /**
     * Serialize concurrent scheduling attempts for the same room.
     *
     * Implementations should acquire a transaction-scoped lock so that
     * checking for overlapping events and saving a new event are safe
     * against concurrent requests.
     *
     * @param {string} roomId - Room being scheduled.
     * @param {Object} trx - Active transaction context (mandatory).
     * @returns {Promise<void>}
     */
    async lockRoomForScheduling(roomId, trx) {
        if (
            !roomId ||
            typeof roomId !== "string" ||
            roomId.trim() === ""
        ) {
            throw new ValidationError(
                "EventScheduleRepository: A valid roomId is required to acquire a scheduling lock."
            );
        }

        if (!trx) {
            throw new ValidationError(
                "EventScheduleRepository: An active transaction is required to lock a room."
            );
        }

        throw new Error(
            "EventScheduleRepository.lockRoomForScheduling() must be implemented by the infrastructure layer."
        );
    }

    /**
     * Checks if there are any existing events scheduled in the same room
     * that overlap with the provided timeframe.
     *
     * @param {string} roomId - Identifier of the room being checked.
     * @param {Date|string} startTime - The target start timestamp.
     * @param {Date|string} endTime - The target end timestamp.
     * @param {string|null} [excludeId=null] - Optional event ID to exclude.
     * @param {Object|null} [trx=null] - Optional transaction context.
     * @returns {Promise<boolean>} True if an overlap exists, otherwise false.
     */
    async existsOverlappingEvent(
        roomId,
        startTime,
        endTime,
        excludeId = null,
        trx = null
    ) {
        if (
            !roomId ||
            typeof roomId !== "string" ||
            roomId.trim() === ""
        ) {
            throw new ValidationError(
                "EventScheduleRepository: A valid, non-empty roomId string is required to evaluate schedule overlapping."
            );
        }

        const start =
            startTime instanceof Date
                ? startTime
                : new Date(startTime);

        const end =
            endTime instanceof Date
                ? endTime
                : new Date(endTime);

        if (
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime())
        ) {
            throw new ValidationError(
                "EventScheduleRepository: Invalid timestamps provided for overlap evaluation."
            );
        }

        if (start >= end) {
            throw new ValidationError(
                "EventScheduleRepository: Invalid timeframe. Start time must be strictly before end time."
            );
        }

        throw new Error(
            "EventScheduleRepository.existsOverlappingEvent() must be implemented by the infrastructure layer."
        );
    }

    /**
     * Execute a unit of work safely inside a managed database transaction.
     *
     * @param {function} callback - Functional tracking hook containing operations to run within the transaction.
     * @returns {Promise<any>} The result returned from the callback function.
     */
    async transaction(callback) {
        if (typeof callback !== "function") {
            throw new ValidationError(
                "EventScheduleRepository: Transaction loops require an executable callback function handler."
            );
        }

        throw new Error(
            "EventScheduleRepository.transaction() must be implemented by the infrastructure layer."
        );
    }
}
