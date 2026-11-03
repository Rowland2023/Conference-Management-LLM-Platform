import { Router } from "express";

import { authenticate } from "../../authentication/presentation/middleware/authenticate.js";

import { validate } from "../../../shared/infrastructure/middleware/validate.js";
import { correlationIdMiddleware } from "../../../shared/infrastructure/middleware/correlationId.js";
import { idempotency } from "../../../shared/infrastructure/middleware/idempotency.js";

import {
    notificationIdSchema,
    notificationQuerySchema,
    sendEmailSchema,
    sendSmsSchema,
    sendPushSchema,
    updateNotificationSchema,
} from "./validators/notification.schema.js";

export function createNotificationRouter(notificationController) {

    const router = Router();

    // Cross-cutting middleware
    router.use(correlationIdMiddleware);
    router.use(authenticate);

    // Queries

    router.get(
        "/",
        validate(notificationQuerySchema, "query"),
        notificationController.list
    );

    router.get(
        "/:id",
        validate(notificationIdSchema, "params"),
        notificationController.get
    );

    // Commands

    router.post(
        "/email",
        idempotency,
        validate(sendEmailSchema, "body"),
        notificationController.sendEmail
    );

    router.post(
        "/sms",
        idempotency,
        validate(sendSmsSchema, "body"),
        notificationController.sendSMS
    );

    router.post(
        "/push",
        idempotency,
        validate(sendPushSchema, "body"),
        notificationController.sendPush
    );

    router.put(
        "/:id",
        validate(notificationIdSchema, "params"),
        validate(updateNotificationSchema, "body"),
        notificationController.update
    );

    router.delete(
        "/:id",
        validate(notificationIdSchema, "params"),
        notificationController.delete
    );

    return router;
}