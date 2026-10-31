import express from "express";

import { validate } from "../../../../../Shared/Infrastructure/middleware/validate.js";
import { authGuard } from "../../../../../Shared/Infrastructure/middleware/authGuard.js";
import { idempotency } from "../../../../../Shared/Infrastructure/middleware/idempotency.js";
import { correlationIdMiddleware } from "../../../../../Shared/Infrastructure/middleware/correlationId.js";

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