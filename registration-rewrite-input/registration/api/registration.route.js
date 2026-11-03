
import { Router } from "express";
import { validate } from "../../../shared/infrastructure/middleware/validate.js";

import {
    createRegistrationSchema,
    updateRegistrationSchema,
    registrationIdSchema,
    registrationQuerySchema,
    checkInRegistrationSchema,
    cancelRegistrationSchema,
} from "./validators/registration.schema.js";

export function getRegistrationRoutes(
    registrationController,
    authenticateMiddleware,
) {
    if (typeof authenticateMiddleware !== "function") {
        throw new TypeError(
            "Registration routes require an authentication middleware.",
        );
    }

    const router = Router();

    // Protect every registration endpoint.
    router.use(authenticateMiddleware);

    router.post(
        "/",
        validate(createRegistrationSchema, "body"),
        registrationController.createRegistration,
    );

    router.get(
        "/",
        validate(registrationQuerySchema, "query"),
        registrationController.getAllRegistrations,
    );

    router.get(
        "/:id",
        validate(registrationIdSchema, "params"),
        registrationController.getRegistrationById,
    );

    router.patch(
        "/:id",
        validate(registrationIdSchema, "params"),
        validate(updateRegistrationSchema, "body"),
        registrationController.updateRegistration,
    );

    router.post(
        "/:id/check-in",
        validate(registrationIdSchema, "params"),
        validate(checkInRegistrationSchema, "body"),
        registrationController.checkInRegistration,
    );

    router.delete(
        "/:id",
        validate(registrationIdSchema, "params"),
        validate(cancelRegistrationSchema, "body"),
        registrationController.cancelRegistration,
    );

    return router;
}
