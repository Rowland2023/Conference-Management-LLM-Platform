import express from "express";

import { validate } from "../../../../../shared/infrastructure/middleware/validate.js";
import { authGuard } from "../../../../../shared/infrastructure/middleware/authGuard.js";
import { idempotency } from "../../../../../shared/infrastructure/middleware/idempotency.js";
import { correlationIdMiddleware } from "../../../../../shared/infrastructure/middleware/correlationId.js";

import {
    postJournalEntrySchema,
    reverseJournalEntrySchema,
    getJournalEntrySchema,
} from "../validators/journal.validator.js";


export default function createJournalRoutes(
    journalController
) {

    const router = express.Router();


    router.use(correlationIdMiddleware);

    router.use(authGuard);


    router.post(
        "/",
        idempotency,
        validate(postJournalEntrySchema),
        journalController.postEntry
    );


    router.post(
        "/:id/reverse",
        idempotency,
        validate(reverseJournalEntrySchema),
        journalController.reverseEntry
    );


    router.get(
        "/:id",
        validate(getJournalEntrySchema),
        journalController.getEntry
    );


    return router;
}