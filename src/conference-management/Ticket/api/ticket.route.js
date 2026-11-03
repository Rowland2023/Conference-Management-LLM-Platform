
import { Router } from "express";

import { correlationIdMiddleware } from "../../../shared/infrastructure/middleware/correlationId.js";
import { idempotency } from "../../../shared/infrastructure/middleware/idempotency.js";
import { validate } from "../../../shared/infrastructure/middleware/validate.js";

import {
  createTicketSchema,
  ticketIdSchema,
  reserveTicketSchema,
  releaseTicketSchema,
  cancelTicketSchema,
  ticketQuerySchema,
} from "./validators/ticket.schema.js";

export function createTicketRouter({
  ticketController,
  authenticateMiddleware,
}) {
  if (!ticketController) {
    throw new Error("TicketRouter requires ticketController.");
  }

  if (typeof authenticateMiddleware !== "function") {
    throw new Error("TicketRouter requires authenticateMiddleware.");
  }

  const router = Router();

  router.use(correlationIdMiddleware);
  router.use(authenticateMiddleware);

  const idempotencyMiddleware = idempotency();

  const handler = method => (req, res, next) => {
    const fn = ticketController[method];

    if (typeof fn !== "function") {
      return next(
        new Error(`TicketController method '${method}' is not implemented.`)
      );
    }

    return Promise.resolve(fn.call(ticketController, req, res, next))
      .catch(next);
  };

  router.post(
    "/",
    idempotencyMiddleware,
    validate(createTicketSchema, "body"),
    handler("createTicket")
  );

  router.post(
    "/:id/reserve",
    idempotencyMiddleware,
    validate(ticketIdSchema, "params"),
    validate(reserveTicketSchema, "body"),
    handler("reserveTicket")
  );

  router.post(
    "/:id/release",
    idempotencyMiddleware,
    validate(ticketIdSchema, "params"),
    validate(releaseTicketSchema, "body"),
    handler("releaseTicket")
  );

  router.post(
    "/:id/cancel",
    idempotencyMiddleware,
    validate(ticketIdSchema, "params"),
    validate(cancelTicketSchema, "body"),
    handler("cancelTicket")
  );

  router.get(
    "/",
    validate(ticketQuerySchema, "query"),
    handler("listTickets")
  );

  router.get(
    "/:id",
    validate(ticketIdSchema, "params"),
    handler("getTicketById")
  );

  return router;
}
