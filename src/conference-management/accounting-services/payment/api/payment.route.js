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

import { authGuard } from "../../../../shared/infrastructure/middleware/authGuard.js";
import { validate } from "../../../../shared/infrastructure/middleware/validate.js";
import { webhookRawBody } from "../../../../shared/infrastructure/middleware/webhookRawBody.js";
import { rateLimit } from "../../../../shared/infrastructure/middleware/rateLimit.js";
import { ipAllowlist } from "../../../../shared/infrastructure/middleware/ipAllowlist.js";
import { idempotency } from "../../../../shared/infrastructure/middleware/idempotency.js";

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
}) {

    const router = express.Router();



    /**
     * Create payment
     *
     * POST /payments
     */
    router.post(
        "/payments",

        authGuard(),

        rateLimit({
            max: 10,
            windowMs: 60_000,
        }),

        validate(
            createPaymentSchema
        ),

        idempotency(),

        paymentController.createPayment
    );



    /**
     * Get payment by id
     *
     * GET /payments/:id
     */
    router.get(
        "/payments/:id",

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

        authGuard("admin"),

        rateLimit({
            max: 5,
            windowMs: 60_000,
        }),

        validate(
            refundPaymentSchema
        ),

        idempotency(),

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