
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
  controller,
  authenticateMiddleware
) {
  const router = Router();

  router.use(authenticateMiddleware);

  router.post(
    "/",
    validate(createRegistrationSchema, "body"),
    controller.createRegistration
  );

  router.get(
    "/",
    validate(registrationQuerySchema, "query"),
    controller.getAllRegistrations
  );

  router.get(
    "/:id",
    validate(registrationIdSchema, "params"),
    controller.getRegistrationById
  );

  router.patch(
    "/:id",
    validate(registrationIdSchema, "params"),
    validate(updateRegistrationSchema, "body"),
    controller.updateRegistration
  );

  router.post(
    "/:id/check-in",
    validate(checkInRegistrationSchema, "params"),
    controller.checkInRegistration
  );

  router.delete(
    "/:id",
    validate(cancelRegistrationSchema, "params"),
    controller.cancelRegistration
  );

  return router;
}
