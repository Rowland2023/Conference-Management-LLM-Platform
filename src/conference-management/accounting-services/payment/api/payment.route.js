/**
 * @file src/conference-management/accounting-services/Payment/api/payment.route.js
 *
 * Payment HTTP Routes.
 *
 * Responsibilities:
 * - HTTP boundary
 * - Authentication
 * - Authorization
 * - Validation
 * - Idempotency enforcement
 * - Rate limiting
 *
 * Does NOT:
 * - Execute business logic
 * - Access repositories
 */

import express from "express";

import { authGuard } from "../../../../Shared/Infrastructure/middleware/authGuard.js";
import { validate } from "../../../../Shared/Infrastructure/middleware/validate.js";
import { webhookRawBody } from "../../../../Shared/Infrastructure/middleware/webhookRawBody.js";
import { rateLimit } from "../../../../Shared/Infrastructure/middleware/rateLimit.js";
import { ipAllowlist } from "../../../../Shared/Infrastructure/middleware/ipAllowlist.js";
import { idempotency } from "../../../../Shared/Infrastructure/middleware/idempotency.js";

import {
    createPaymentSchema,
    refundPaymentSchema,
    getPaymentByIdSchema,
} from "./validators/payment.schema.js";


const STRIPE_IPS = [
    "3.18.12.63/32",
    "3.130.192.231/32",
    "54.187.174.169/32",
    "54.187.205.235/32",
    "54.187.216.72/32",
];


const PAYSTACK_IPS = [
    "52.31.139.75/32",
    "52.49.173.169/32",
    "52.214.14.220/32",
];



export default function createPaymentRouter({
    paymentController,
    paymentWebhookController,
    authenticateMiddleware,
}) {
    if (typeof authenticateMiddleware !== "function") {
        throw new Error("Payment router requires authenticateMiddleware.");
    }

    const router = express.Router();



    /**
     * Create payment
     *
     * POST /payments
     */
    router.post(
        "/payments",

        authenticateMiddleware,
        authGuard(),

        rateLimit({
            max: 10,
            windowMs: 60_000,
        }),

        validate(
            createPaymentSchema
        ),

        idempotency({ header: "x-idempotency-key" }),

        paymentController.createPayment
    );



    /**
     * Get payment by id
     *
     * GET /payments/:id
     */
    router.get(
        "/payments/:id",

        authenticateMiddleware,
        authGuard(),

        rateLimit({
            max: 100,
            windowMs: 60_000,
        }),

        validate(
            getPaymentByIdSchema
        ),

        paymentController.getPaymentById
    );



    /**
     * List payments
     *
     * GET /payments
     */
    router.get(
        "/payments",

        authenticateMiddleware,
        authGuard("admin"),

        rateLimit({
            max: 20,
            windowMs: 60_000,
        }),

        paymentController.getAllPayments
    );



    /**
     * Refund payment
     *
     * POST /payments/:id/refund
     */
    router.post(
        "/payments/:id/refund",

        authenticateMiddleware,
        authGuard("admin"),

        rateLimit({
            max: 5,
            windowMs: 60_000,
        }),

        validate(
            refundPaymentSchema
        ),

        idempotency({ header: "x-idempotency-key" }),

        paymentController.refundPayment
    );



    /**
     * Paystack webhook
     *
     * POST /webhooks/paystack
     */
    router.post(
        "/webhooks/paystack",

        ipAllowlist(
            PAYSTACK_IPS
        ),

        webhookRawBody(),

        paymentWebhookController.handlePaystackWebhook
    );



    /**
     * Stripe webhook
     *
     * POST /webhooks/stripe
     */
    router.post(
        "/webhooks/stripe",

        ipAllowlist(
            STRIPE_IPS
        ),

        webhookRawBody(),

        paymentWebhookController.handleStripeWebhook
    );



    return router;
}