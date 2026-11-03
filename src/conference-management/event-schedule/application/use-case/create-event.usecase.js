
import {
    ValidationError,
    ConflictError,
} from "../../../../Shared/application/errors/ApplicationErrors.js";

import { Event } from "../../domain/entities/event.js";

export class CreateEventUseCase {
    constructor({
        eventRepository,
        outboxRepository,
        uow,
        logger,
        metrics,
    }) {
        if (!eventRepository || !outboxRepository || !uow) {
            throw new TypeError(
                "CreateEventUseCase requires eventRepository, outboxRepository, and uow."
            );
        }

        this.eventRepository = eventRepository;
        this.outboxRepository = outboxRepository;
        this.uow = uow;
        this.logger = logger;
        this.metrics = metrics;
    }

    async execute(command) {
        if (!command || typeof command !== "object") {
            throw new ValidationError(
                "Event creation command is required."
            );
        }

        const {
            title,
            roomId,
            organizerId,
            startTime,
            endTime,
            correlationId,
            causationId,
        } = command;

        if (
            !title ||
            !roomId ||
            !organizerId ||
            !startTime ||
            !endTime
        ) {
            throw new ValidationError(
                "Missing required event information."
            );
        }

        // Create the aggregate and let the domain enforce its invariants.
        const event = Event.create(
            {
                title,
                roomID: roomId,
                organizerId,
                startTime,
                endTime,
            },
            {
                correlationId,
                causationId,
            }
        );

        // Persist the aggregate and its domain events atomically.
        const result = await this.uow.runInTransaction(
            async (trx) => {
                await this.eventRepository.lockRoomForScheduling(
                    roomId,
                    trx
                );

                const hasConflict =
                    await this.eventRepository.existsOverlappingEvent(
                        roomId,
                        startTime,
                        endTime,
                        null,
                        trx
                    );

                if (hasConflict) {
                    throw new ConflictError(
                        "Room already has a scheduled event."
                    );
                }

                await this.eventRepository.save(event, trx);

                const domainEvents = event.pullEvents();

                await this.outboxRepository.save(
                    domainEvents,
                    trx
                );

                return {
                    eventId: event.id,
                };
            }
        );

        // Execute side effects only after successful transaction commit.
        this.logger?.info("EVENT_CREATED", {
            eventId: result.eventId,
        });

        this.metrics?.increment("event.created");

        return result;
    }
}
