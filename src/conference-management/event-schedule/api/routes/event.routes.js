
// src/conference-management/event-schedule/api/routes/event.routes.js

import { Router } from "express";

import { correlationIdMiddleware } from "../../../../Shared/Infrastructure/middleware/correlationId.js";
import { validate } from "../../../../Shared/Infrastructure/middleware/validate.js";

import {
    createEventSchema,
    eventIdSchema,
    eventQuerySchema,
    rescheduleEventSchema,
} from "../validators/event.validators.js";

export default function createEventRouter({
    eventController,
    authenticateMiddleware,
}) {
    if (!eventController) {
        throw new Error(
            "createEventRouter: 'eventController' is required.",
        );
    }

    if (typeof authenticateMiddleware !== "function") {
        throw new TypeError(
            "createEventRouter: 'authenticateMiddleware' must be a function.",
        );
    }

    const router = Router();

    // Cross-cutting middleware
    router.use(correlationIdMiddleware);
    router.use(authenticateMiddleware);

    // Commands

    router.post(
        "/",
        validate(createEventSchema, "body"),
        eventController.createEvent,
    );

    router.patch(
        "/:id/reschedule",
        validate(eventIdSchema, "params"),
        validate(rescheduleEventSchema, "body"),
        eventController.rescheduleEvent,
    );

    router.delete(
        "/:id",
        validate(eventIdSchema, "params"),
        eventController.cancelEvent,
    );

    // Queries

    router.get(
        "/",
        validate(eventQuerySchema, "query"),
        eventController.listEvents,
    );

    router.get(
        "/:id",
        validate(eventIdSchema, "params"),
        eventController.getEventById,
    );

    return router;
}
