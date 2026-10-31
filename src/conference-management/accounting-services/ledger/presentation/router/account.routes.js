import express from "express";

import { validate } from "../../../../../Shared/Infrastructure/middleware/validate.js";
import { authGuard } from "../../../../../Shared/Infrastructure/middleware/authGuard.js";
import {
    createAccountSchema,
    getAccountBalanceSchema,
} from "../validators/account.validator.js";

export default function createAccountRoutes(accountController) {
    const router = express.Router();

    // Authenticate every account endpoint
    router.use(authGuard);

    // Create account
    router.post(
        "/",
        validate(createAccountSchema, "body"),
        accountController.createAccount
    );

    // Get account balance
    router.get(
        "/:id/balance",
        validate(getAccountBalanceSchema, "params"),
        accountController.getBalance
    );

    // List accounts
    router.get(
        "/",
        accountController.listAccounts
    );

    return router;
}