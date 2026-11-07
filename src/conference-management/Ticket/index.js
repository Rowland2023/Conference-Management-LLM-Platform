
// src/conference-management/ticket/index.js

import { TicketMapper } from "./Infrastructure/mappers/TicketMapper.js";
import { PostgresTicketRepository } from "./Infrastructure/repository/PostgresTicketRepository.js";
import { TicketCommandService } from "./application/commands/TicketCommandService.js";
import { TicketQueryService } from "./application/queries/TicketQueryService.js";
import { TicketController } from "./api/ticket.controller.js";
import { createTicketRouter } from "./api/ticket.route.js";

export function createTicketModule({
    db,
    unitOfWorkFactory,
    outboxRepository,
    logger,
    authenticateMiddleware,
}) {
    if (typeof db !== "function") {
        throw new Error(
            "TicketModule requires a Knex database connection."
        );
    }

    if (typeof unitOfWorkFactory !== "function") {
        throw new Error(
            "TicketModule requires unitOfWorkFactory."
        );
    }

    if (
        !outboxRepository ||
        typeof outboxRepository.save !== "function"
    ) {
        throw new Error(
            "TicketModule requires outboxRepository.save()."
        );
    }

    if (typeof authenticateMiddleware !== "function") {
        throw new Error(
            "TicketModule requires authenticateMiddleware."
        );
    }

    const unitOfWork = unitOfWorkFactory();

    if (
        !unitOfWork ||
        typeof unitOfWork.runInTransaction !== "function"
    ) {
        throw new Error(
            "TicketModule unit of work must expose runInTransaction(callback)."
        );
    }

    const ticketMapper = new TicketMapper();

    const ticketRepository = new PostgresTicketRepository({
        db,
        mapper: ticketMapper,
    });

    const ticketCommandService = new TicketCommandService({
        ticketRepository,
        outboxRepository,
        unitOfWork,
        logger,
    });

    const ticketQueryService = new TicketQueryService({
        ticketRepository,
        logger,
    });

    const ticketController = new TicketController({
        ticketCommandService,
        ticketQueryService,
    });

    const router = createTicketRouter({
        ticketController,
        authenticateMiddleware,
    });

    const subscriptions = [];

    function extractEvent(envelope) {
        const payload = envelope?.payload ?? envelope ?? {};
        const metadata = envelope?.metadata ?? envelope ?? {};

        return {
            payload,
            correlationId: metadata.correlationId ?? null,
        };
    }

    function subscribe(eventBus, eventName, handler) {
        const subscription = eventBus.subscribe(
            eventName,
            handler
        );

        if (subscription) {
            subscriptions.push(subscription);
        }
    }

    return {
        name: "ticket",
        basePath: "/tickets",
        router,

        subscribe(eventBus) {
            if (
                !eventBus ||
                typeof eventBus.subscribe !== "function"
            ) {
                logger?.warn?.(
                    "TicketModule: EventBus not supplied."
                );
                return;
            }

            subscribe(
                eventBus,
                "payment.failed",
                async (envelope) => {
                    const { payload, correlationId } =
                        extractEvent(envelope);

                    if (
                        !payload.ticketId ||
                        !Number.isSafeInteger(payload.quantity) ||
                        payload.quantity <= 0
                    ) {
                        logger?.warn?.(
                            { payload },
                            "Ignoring payment.failed event with invalid ticket fields."
                        );
                        return;
                    }

                    await ticketCommandService.releaseTicket({
                        ticketId: payload.ticketId,
                        quantity: payload.quantity,
                        correlationId,
                    });
                }
            );

            subscribe(
                eventBus,
                "payment.succeeded",
                async (envelope) => {
                    const { payload, correlationId } =
                        extractEvent(envelope);

                    const paymentId =
                        payload.paymentId ??
                        payload.paymentReference;

                    if (
                        !payload.ticketId ||
                        !paymentId ||
                        !Number.isSafeInteger(payload.quantity) ||
                        payload.quantity <= 0
                    ) {
                        logger?.warn?.(
                            { payload },
                            "Ignoring payment.succeeded event with invalid purchase fields."
                        );
                        return;
                    }

                    await ticketCommandService.confirmPurchase({
                        ticketId: payload.ticketId,
                        quantity: payload.quantity,
                        paymentId,
                        correlationId,
                    });
                }
            );

            subscribe(
                eventBus,
                "conference.cancelled",
                async (envelope) => {
                    const { payload, correlationId } =
                        extractEvent(envelope);

                    if (!payload.conferenceId) {
                        logger?.warn?.(
                            { payload },
                            "Ignoring conference.cancelled event without conferenceId."
                        );
                        return;
                    }

                    await ticketCommandService
                        .cancelTicketsByConference({
                            conferenceId: payload.conferenceId,
                            reason:
                                payload.reason ??
                                "CONFERENCE_CANCELLED",
                            correlationId,
                        });
                }
            );

            logger?.info?.(
                "TicketModule event subscriptions registered."
            );
        },

        async start() {
            logger?.info?.("Ticket module started.");
        },

        async stop(eventBus) {
            if (
                eventBus &&
                typeof eventBus.unsubscribe === "function"
            ) {
                for (const subscription of subscriptions.splice(0)) {
                    await eventBus.unsubscribe(subscription);
                }
            }

            logger?.info?.("Ticket module stopped.");
        },
    };
}
