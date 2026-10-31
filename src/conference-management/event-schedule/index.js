// src/conference-management/event-schedule/index.js
// Composition Root for Event Schedule sub-module inside Conference Management

import { PostgresEventRepository as KnexEventRepository } from "./infrastructure/repositories/PostgresEventRepository.js";
import { PostgresOutboxRepository } from "../../Shared/Infrastructure/messaging/outbox/PostgresOutboxRepository.js";

// Domain Service
import { EventSchedulingService } from "./domain/service/Eventscheduling.service.js";

// Use Cases
import { CreateEventUseCase } from "./application/use-case/create-event.usecase.js";
import { RescheduleEventUseCase } from "./application/use-case/reschedule-event.usecase.js";
import { CancelEventUseCase } from "./application/use-case/cancel-event.usecase.js";
import { GetEventUseCase } from "./application/use-case/get-event.usecase.js";
import { ListEventsUseCase } from "./application/use-case/list-event.usecase.js";

// API Layer
import { EventController } from "./api/controllers/event.controllers.js";
import createEventRouter from "./api/routes/event.routes.js";

export function createConferenceEventScheduleSubModule({
    db,
    unitOfWorkFactory,
    eventBus,
    logger,
    authenticateMiddleware,
}) {
    // ---------------------------------------------------------
    // Fail-fast dependency validation
    // ---------------------------------------------------------

    if (!db) {
        throw new Error(
            "ConferenceEventScheduleSubModule: 'db' is required.",
        );
    }

    if (!unitOfWorkFactory) {
        throw new Error(
            "ConferenceEventScheduleSubModule: 'unitOfWorkFactory' is required.",
        );
    }

    if (!eventBus) {
        throw new Error(
            "ConferenceEventScheduleSubModule: 'eventBus' is required.",
        );
    }

    if (!logger) {
        throw new Error(
            "ConferenceEventScheduleSubModule: 'logger' is required.",
        );
    }

    if (typeof authenticateMiddleware !== "function") {
        throw new TypeError(
            "ConferenceEventScheduleSubModule: 'authenticateMiddleware' must be a function.",
        );
    }

    // ---------------------------------------------------------
    // Transaction scope
    // ---------------------------------------------------------

    const uow = unitOfWorkFactory();

    // ---------------------------------------------------------
    // Repositories
    // ---------------------------------------------------------

    const eventRepository = new KnexEventRepository({
        db,
    });

    const outboxRepository = new PostgresOutboxRepository({
        db,
    });

    // ---------------------------------------------------------
    // Domain services
    // ---------------------------------------------------------

    const eventSchedulingService = new EventSchedulingService({
        eventRepository,
    });

    // ---------------------------------------------------------
    // Application use cases
    // ---------------------------------------------------------

    const createEventUseCase = new CreateEventUseCase({
        eventRepository,
        outboxRepository,
        eventSchedulingService,
        uow,
        logger,
    });

    const rescheduleEventUseCase = new RescheduleEventUseCase({
        eventRepository,
        outboxRepository,
        eventSchedulingService,
        uow,
        logger,
    });

    const cancelEventUseCase = new CancelEventUseCase({
        eventRepository,
        outboxRepository,
        eventSchedulingService,
        uow,
        logger,
    });

    const getEventUseCase = new GetEventUseCase({
        eventRepository,
        logger,
    });

    const listEventsUseCase = new ListEventsUseCase({
        eventRepository,
        logger,
    });
// ---------------------------------------------------------
    // Presentation layer
    // ---------------------------------------------------------

    const eventController = new EventController({
    createEventUseCase,
    rescheduleEventUseCase,
    cancelEventUseCase,
    getEventByIdUseCase: getEventUseCase,
    listEventsUseCase,
    logger,
});

    const eventRouter = createEventRouter({
        eventController,
        authenticateMiddleware,
    });

    // ---------------------------------------------------------
    // Integration and module lifecycle
    // ---------------------------------------------------------

    let subscriptionToken = null;

    return {
        // Standard module interface used by bootstrapRoutes()
        name: "event-schedule",
        basePath: "/api/v1/events",
        router: eventRouter,

        // Compatibility for existing eventRouter consumers
        eventRouter,

        subscribe() {
            subscriptionToken = eventBus.subscribe(
                "booking.payment_confirmed",
                async (evt) => {
                    try {
                        await createEventUseCase.execute({
                            bookingId: evt.payload.bookingId,
                            slotId: evt.payload.slotId,
                            correlationId: evt.correlationId,
                        });
                    } catch (err) {
                        logger.error(
                            {
                                err,
                                eventId: evt.id,
                            },
                            "Failed to process booking.payment_confirmed event.",
                        );
                    }
                },
            );
        },

        async stop() {
if (
                subscriptionToken &&
                typeof eventBus.unsubscribe === "function"
            ) {
                eventBus.unsubscribe(
                    "booking.payment_confirmed",
                    subscriptionToken,
                );

                subscriptionToken = null;
            }
        },
    };
}