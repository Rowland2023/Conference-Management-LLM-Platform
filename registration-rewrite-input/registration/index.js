
import { randomUUID } from "node:crypto";

import { PostgresOutboxRepository } from "../../shared/infrastructure/messaging/outbox/PostgresOutboxRepository.js";

import { RegistrationRepository } from "./infrastructure/repositories/RegistrationRepository.js";
import { ConferenceRepository } from "./infrastructure/repositories/ConferenceRepository.js";

import { CreateRegistrationUseCase } from "./application/user-cases/CreateRegistrationUseCase.js";
import { GetRegistrationUseCase } from "./application/user-cases/GetRegistrationUseCase.js";
import { GetAllRegistrationsUseCase } from "./application/user-cases/GetAllRegistrationsUseCase.js";
import { UpdateRegistrationUseCase } from "./application/user-cases/UpdateRegistrationUseCase.js";
import { CancelRegistrationUseCase } from "./application/user-cases/CancelRegistrationUseCase.js";
import { CheckInRegistrationUseCase } from "./application/user-cases/CheckInRegistrationUseCase.js";

import { RegistrationController } from "./api/registration.controller.js";
import { getRegistrationRoutes } from "./api/registration.route.js";

const MODULE_NAME = "ConferenceRegistrationSubModule";
const CONFERENCE_DELETED_EVENT = "conference.deleted";

function validateDependencies({
    db,
    unitOfWorkFactory,
    eventBus,
    logger,
    authenticateMiddleware,
}) {
    if (typeof db !== "function") {
        throw new TypeError(`${MODULE_NAME}: 'db' must be a Knex client.`);
    }

    if (typeof unitOfWorkFactory !== "function") {
        throw new TypeError(
            `${MODULE_NAME}: 'unitOfWorkFactory' must be a function.`,
        );
    }

    if (
        !eventBus ||
        typeof eventBus.subscribe !== "function"
    ) {
        throw new TypeError(
            `${MODULE_NAME}: 'eventBus.subscribe' is required.`,
        );
    }

    if (
        !logger ||
        typeof logger.info !== "function" ||
        typeof logger.warn !== "function" ||
        typeof logger.error !== "function"
    ) {
        throw new TypeError(
            `${MODULE_NAME}: a compatible logger is required.`,
        );
    }

    if (typeof authenticateMiddleware !== "function") {
        throw new TypeError(
            `${MODULE_NAME}: 'authenticateMiddleware' must be a function.`,
        );
    }
}

export function createConferenceRegistrationSubModule({
    db,
    unitOfWorkFactory,
    eventBus,
    logger,
    authenticateMiddleware,
    uuidService,
}) {
    validateDependencies({
        db,
        unitOfWorkFactory,
        eventBus,
        logger,
        authenticateMiddleware,
    });

    // Prefer the injected implementation; otherwise use Node.js crypto.
    const resolvedUuidService = uuidService ?? {
        generate: randomUUID,
    };

    if (typeof resolvedUuidService.generate !== "function") {
        throw new TypeError(
            `${MODULE_NAME}: 'uuidService.generate' must be a function.`,
        );
    }

    // Transaction manager.
    const uow = unitOfWorkFactory();

    if (!uow || typeof uow.runInTransaction !== "function") {
        throw new TypeError(
            `${MODULE_NAME}: unit of work must implement runInTransaction().`,
        );
    }

    // Repositories.
    // RegistrationRepository expects the Knex client directly.
    // ConferenceRepository and PostgresOutboxRepository expect { db }.
    const registrationRepository = new RegistrationRepository(db);
    const conferenceRepository = new ConferenceRepository({ db });
    const outboxRepository = new PostgresOutboxRepository({ db });

    // Application use cases.
    const createRegistrationUseCase = new CreateRegistrationUseCase({
        registrationRepository,
        conferenceRepository,
        outboxRepository,
        uuidService: resolvedUuidService,
        transactionManager: uow,
        logger,
    });

    const getRegistrationUseCase = new GetRegistrationUseCase({
        registrationRepository,
        logger,
    });

    const getAllRegistrationsUseCase = new GetAllRegistrationsUseCase({
        registrationRepository,
        logger,
    });

    const updateRegistrationUseCase = new UpdateRegistrationUseCase({
        registrationRepository,
        outboxRepository,
        transactionManager: uow,
        logger,
    });

    const cancelRegistrationUseCase = new CancelRegistrationUseCase({
        registrationRepository,
        outboxRepository,
        transactionManager: uow,
        logger,
    });

    const checkInRegistrationUseCase = new CheckInRegistrationUseCase({
        registrationRepository,
        outboxRepository,
        transactionManager: uow,
        logger,
    });

    // HTTP presentation layer.
    const registrationController = new RegistrationController({
        createRegistrationUseCase,
        getRegistrationUseCase,
        getAllRegistrationsUseCase,
        updateRegistrationUseCase,
        cancelRegistrationUseCase,
        checkInRegistrationUseCase,
        logger,
    });

    const router = getRegistrationRoutes(
        registrationController,
        authenticateMiddleware,
    );

    // Event subscription lifecycle.
    let subscriptionToken = null;

    return {
        name: "registration",
        basePath: "/registrations",
        router,

        subscribe() {
            if (subscriptionToken !== null) {
                return;
            }

            const token = eventBus.subscribe(
                CONFERENCE_DELETED_EVENT,
                async (event) => {
                    const {
                        conferenceId,
                        correlationId,
                    } = event ?? {};

                    if (!conferenceId) {
                        logger.warn(
                            { event },
                            "Received conference.deleted without conferenceId.",
                        );
                        return;
                    }

                    try {
                        await cancelRegistrationUseCase.execute({
                            conferenceId,
                            reason: "CONFERENCE_CANCELLED",
                            correlationId,
                        });
                    } catch (error) {
                        logger.error(
                            {
                                error,
                                conferenceId,
                                correlationId,
                            },
                            "Failed to process conference.deleted event.",
                        );
                    }
                },
            );

            subscriptionToken = token ?? true;
        },

        async start() {
            logger.info(
                "Conference Registration sub-module initialized.",
            );
        },

        async stop() {
            if (subscriptionToken !== null) {
                if (typeof eventBus.unsubscribe === "function") {
                    eventBus.unsubscribe(
                        CONFERENCE_DELETED_EVENT,
                        subscriptionToken === true
                            ? undefined
                            : subscriptionToken,
                    );
                }

                subscriptionToken = null;
            }

            logger.info(
                "Conference Registration sub-module stopped.",
            );
        },
    };
}
