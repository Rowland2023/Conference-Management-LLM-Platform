import {
    ValidationError,
    NotFoundError,
    ConflictError,
} from "../../../../Shared/application/errors/ApplicationErrors.js";

export class RescheduleEventUseCase {
    constructor({
        eventRepository,
        outboxRepository,
        uow,
        logger,
    }) {
        if (!eventRepository || !outboxRepository || !uow) {
            throw new TypeError(
                "RescheduleEventUseCase requires eventRepository, outboxRepository, and uow."
            );
        }

        this.eventRepository = eventRepository;
        this.outboxRepository = outboxRepository;
        this.uow = uow;
        this.logger = logger;
    }

    async execute({
        eventId,
        startTime,
        endTime,
        rescheduledBy,
        reason = "user_request",
        correlationId = null,
        causationId = null,
    } = {}) {
        if (
            !eventId ||
            !startTime ||
            !endTime ||
            !rescheduledBy
        ) {
            throw new ValidationError(
                "Event ID, new start time, new end time, and rescheduling actor are required."
            );
        }

        const result = await this.uow.runInTransaction(async (trx) => {
            const event = await this.eventRepository.findByIdForUpdate(
                eventId,
                trx
            );

            if (!event) {
                throw new NotFoundError("Event not found.");
            }

            // Serialize scheduling operations for this room.
            await this.eventRepository.lockRoomForScheduling(
                event.roomID,
                trx
            );

            const hasConflict =
                await this.eventRepository.existsOverlappingEvent(
                    event.roomID,
                    startTime,
                    endTime,
                    eventId,
                    trx
                );

            if (hasConflict) {
                throw new ConflictError(
                    "Scheduling conflict detected for the selected room."
                );
            }

            event.reschedule(
                { startTime, endTime },
                {
                    rescheduledBy,
                    reason,
                    correlationId,
                    causationId,
                }
            );

            await this.eventRepository.save(event, trx);

            const domainEvents = event.pullEvents();

            await this.outboxRepository.save(domainEvents, trx);

            return {
                eventId: event.id,
                startTime: event.startTime,
                endTime: event.endTime,
                status: event.status,
                version: event.version,
            };
        });

        this.logger?.info("EVENT_RESCHEDULED", {
            eventId: result.eventId,
        });

        return result;
    }
}