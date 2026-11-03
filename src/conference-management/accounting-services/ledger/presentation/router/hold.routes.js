/**
 * @file src/conference-management/accounting-services/ledger/presentation/router/hold.routes.js
 *
 * Routes for ledger hold operations.
 */

import express from "express";

import { validate } 
    from "../../../../../shared/infrastructure/middleware/validate.js";

import { authGuard } 
    from "../../../../../shared/infrastructure/middleware/authGuard.js";


import {
    holdFundsSchema,
    releaseHoldSchema,
} from "../validators/hold.validator.js";


/**
 * Creates ledger hold HTTP routes.
 *
 * @param {Object} holdController
 * @param {Function} holdController.createHold
 * @param {Function} holdController.releaseHold
 *
 * @returns {import("express").Router}
 */
export default function createHoldRoutes(
    holdController
) {

    if (!holdController) {
        throw new Error(
            "createHoldRoutes: holdController is required"
        );
    }


    const router = express.Router();



    /**
     * Authentication boundary.
     */
    router.use(authGuard);



    /**
     * POST /holds
     *
     * Creates a balance reservation/hold.
     */
    router.post(
        "/",
        validate(
            holdFundsSchema,
            "body"
        ),
        holdController.createHold
    );



    /**
     * POST /holds/:id/release
     *
     * Releases an active hold.
     */
    router.post(
        "/:id/release",
        validate(
            releaseHoldSchema
        ),
        holdController.releaseHold
    );



    return router;
}