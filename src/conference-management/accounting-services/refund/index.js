
// src/conference-management/accounting-services/refund/index.js

import { Router } from "express";

import { RefundRepository }
    from "./infrastructure/repositories/RefundRepository.js";

import {
    PaystackGatewayAdapter,
} from "./infrastructure/repositories/adapters/PaymentGatewayAdapter.js";

import ProcessRefundUseCase
    from "./application/ProcessRefundUseCase.js";

import RefundService
    from "./application/RefundService.js";

import RefundController
    from "./presentation/http/RefundController.js";

import { createRefundRoutes }
    from "./presentation/http/refund.routes.js";


export function createRefundModule(shared) {
    const {
        knex,
        httpClient,
        dbTransactionManager,
        logger,
        outboxRepository,
        config = {},
    } = shared;

    // =====================================================
    // Configuration
    // =====================================================

    const paystackSecretKey =
        config.paystack?.secretKey ??
        process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
        throw new Error(
            "PAYSTACK_SECRET_KEY environment variable is required."
        );
    }

    // =====================================================
    // Infrastructure
    // =====================================================

    const refundRepository =
        new RefundRepository({
            knex,
        });

    const paymentGatewayAdapter =
        new PaystackGatewayAdapter({
            httpClient,
            secretKey: paystackSecretKey,
        });

    // =====================================================
    // Application Use Cases
    // =====================================================

    const processRefundUseCase =
        new ProcessRefundUseCase({
            refundRepository,
            paymentGatewayAdapter,
            outboxRepository,
            dbTransactionManager,
            logger,
        });

    // =====================================================
    // Application Services
    // =====================================================

    const refundService =
        new RefundService({
            processRefundUseCase,
        });

    // =====================================================
    // Presentation
    // =====================================================

    const refundController =
        new RefundController({
            refundService,
        });

    const router = Router();

    router.use(
        "/",
        createRefundRoutes(refundController)
    );

    // =====================================================
    // Public Module API
    // =====================================================

    return {
        name: "refund",

        router,

        services: {
            refundService,
        },

        useCases: {
            processRefundUseCase,
        },

        repositories: {
            refundRepository,
        },

        infrastructure: {
            paymentGatewayAdapter,
        },

        subscribe() {
            // Future event subscriptions.
        },

        async start() {
            logger.info("Refund module started.");
        },

        async stop() {
            logger.info("Refund module stopped.");
        },
    };
}
