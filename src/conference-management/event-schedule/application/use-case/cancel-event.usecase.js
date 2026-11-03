import {
    ValidationError,
    NotFoundError,
} from "../../../../Shared/application/errors/ApplicationErrors.js";

export class CancelEventUseCase {
    constructor({
        eventRepository,
        outboxRepository,
        uow,
        logger,
    }) {
        if (!eventRepository || !outboxRepository || !uow) {
            throw new TypeError(
                "CancelEventUseCase requires eventRepository, outboxRepository, and uow."
            );
        }

        this.eventRepository = eventRepository;
        this.outboxRepository = outboxRepository;
        this.uow = uow;
        this.logger = logger;
    }

    async execute({
        eventId,
        cancelledBy,
        reason = null,
        correlationId = null,
        causationId = null,
    } = {}) {
        if (!eventId || !cancelledBy) {
            throw new ValidationError(
                "Event ID and cancellation actor are required."
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

            event.cancel(reason, {
                cancelledBy,
                correlationId,
                causationId,
            });

            await this.eventRepository.save(event, trx);

            const domainEvents = event.pullEvents();

            await this.outboxRepository.save(domainEvents, trx);

            return {
                eventId: event.id,
                status: event.status,
                version: event.version,
            };
        });

        this.logger?.info("EVENT_CANCELLED", {
            eventId: result.eventId,
        });

        return result;
    }
}