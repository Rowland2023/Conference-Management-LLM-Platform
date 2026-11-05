/**
 * @file src/conference-management/accounting-services/payment/index.js
 *
 * Payment bounded-context composition root.
 *
 * Responsibilities:
 * - Validate shared infrastructure.
 * - Instantiate payment infrastructure and provider gateways.
 * - Wire payment and webhook use cases.
 * - Wire application services, controllers and routes.
 * - Expose the public payment module API.
 */

import { randomUUID } from "node:crypto";

import createPaymentRouter from "./api/payment.route.js";

import { PaymentController } from "./api/payment.controller.js";
import { PaymentWebhookController } from "./api/paymentWebhook.controller.js";

import { PaymentService } from "./application/services/PaymentService.js";
import { PaymentWebhookService } from "./application/services/PaymentWebhookService.js";

import { CreatePaymentUseCase } from "./application/use-cases/create-payment.usecase.js";
import { GetAllPaymentsUseCase } from "./application/use-cases/get-all-payments.usecase.js";
import { GetPaymentByIdUseCase } from "./application/use-cases/get-payment-by-id.usecase.js";
import { RefundPaymentUseCase } from "./application/use-cases/refund-payment.usecase.js";

import { HandlePaystackWebhookUseCase } from "./application/use-cases/handle-paystack-webhook.usecase.js";
import { HandleStripeWebhookUseCase } from "./application/use-cases/handle-stripe-webhook.usecase.js";

import { PaystackPaymentGateway } from "./infrastructure/gateways/PaystackPaymentGateway.js";
import { StripePaymentGateway } from "./infrastructure/gateways/StripPaymentGateway.js";

import { RedisLockManager } from "./infrastructure/locks/RedisLockManager.js";

import { PaymentMapper } from "./infrastructure/persistence/mappers/PaymentMapper.js";
import { PostgresPaymentRepository } from "./infrastructure/persistence/repositories/PostgresPaymentRepository.js";
import { PostgresRefundRepository } from "./infrastructure/persistence/repositories/PostgresRefundRepository.js";

import { PaystackWebhookVerifier } from "./infrastructure/webhook/PaystackWebhookVerifier.js";
import { StripeWebhookVerifier } from "./infrastructure/webhook/StripeWebhookVerifier.js";


export function createPaymentModule(shared = {}) {
    const {
        db,
        config = {},
        logger = console,
        outboxRepository,
        redis,
        unitOfWorkFactory,
    } = shared;

    // --------------------------------------------------
    // Validate shared infrastructure
    // --------------------------------------------------

    if (!db) {
        throw new Error("createPaymentModule requires db.");
    }

    if (!outboxRepository) {
        throw new Error("createPaymentModule requires outboxRepository.");
    }

    if (typeof unitOfWorkFactory !== "function") {
        throw new Error("createPaymentModule requires unitOfWorkFactory.");
    }

    const unitOfWork = unitOfWorkFactory();

    if (!unitOfWork || typeof unitOfWork.execute !== "function") {
        throw new Error(
            "unitOfWorkFactory must return an object implementing execute(work).",
        );
    }

    // --------------------------------------------------
    // Shared application dependencies
    // --------------------------------------------------

    const idGenerator = {
        generate: randomUUID,
    };

    const clock = {
        now: () => new Date(),
    };

    // --------------------------------------------------
    // Persistence infrastructure
    // --------------------------------------------------

    const paymentMapper = PaymentMapper;

    const paymentRepository = new PostgresPaymentRepository({
        db,
        paymentMapper,
    });

    const refundRepository = new PostgresRefundRepository({
        db,
    });

    // --------------------------------------------------
    // Lock infrastructure
    // --------------------------------------------------

    const lockManager = new RedisLockManager({
        redis,
        logger,
        namespace: "payments",
    });

    // --------------------------------------------------
    // Provider gateways
    // --------------------------------------------------

    const paystackGateway = config.paystack?.secretKey
        ? new PaystackPaymentGateway(
            config.paystack.secretKey,
            { logger },
        )
        : null;

    const stripeGateway = config.stripe?.secretKey
        ? new StripePaymentGateway(
            config.stripe.secretKey,
            {
                logger,
                apiVersion: config.stripe.apiVersion,
            },
        )
        : null;

    /**
     * Centralized gateway lookup.
     *
     * Both method names are exposed temporarily for compatibility:
     * - getGateway() is the composition-root interface.
     * - create() is currently called by payment use cases.
     *
     * This does not make the provider gateway APIs interchangeable.
     */
    const paymentGatewayFactory = {
        getGateway(provider) {
            switch (String(provider).toLowerCase()) {
                case "paystack":
                    if (!paystackGateway) {
                        throw new Error(
                            "Paystack gateway is not configured.",
                        );
                    }

                    return paystackGateway;

                case "stripe":
                    if (!stripeGateway) {
                        throw new Error(
                            "Stripe gateway is not configured.",
                        );
                    }

                    return stripeGateway;

                default:
                    throw new Error(
                        `Unsupported payment provider: ${provider}`,
                    );
            }
        },

        create(provider) {
            return this.getGateway(provider);
        },
    };

    // --------------------------------------------------
    // Webhook verifiers
    // --------------------------------------------------

    const paystackWebhookVerifier = config.paystack?.webhookSecret
        ? new PaystackWebhookVerifier(
            config.paystack.webhookSecret,
            { logger },
        )
        : null;

    const stripeWebhookVerifier = (
        config.stripe?.secretKey &&
        config.stripe?.webhookSecret
    )
        ? new StripeWebhookVerifier(
            config.stripe.secretKey,
            config.stripe.webhookSecret,
            {
                logger,
                apiVersion: config.stripe.apiVersion,
            },
        )
        : null;

    // --------------------------------------------------
    // Payment use cases
    // --------------------------------------------------

    const createPaymentUseCase = new CreatePaymentUseCase({
        paymentRepository,
        paymentGatewayFactory,
        unitOfWork,
        idGenerator,
        clock,
        lockManager,
        outboxRepository,
        logger,
    });

    const refundPaymentUseCase = new RefundPaymentUseCase({
        paymentRepository,
        refundRepository,
        paymentGatewayFactory,
        unitOfWork,
        idGenerator,
        clock,
        lockManager,
        outboxRepository,
        logger,
    });

    const getPaymentByIdUseCase = new GetPaymentByIdUseCase({
        paymentRepository,
        logger,
    });

    const getAllPaymentsUseCase = new GetAllPaymentsUseCase({
        paymentRepository,
        logger,
    });

    // --------------------------------------------------
    // Webhook use cases
    // --------------------------------------------------

    const handlePaystackWebhookUseCase = paystackWebhookVerifier
        ? new HandlePaystackWebhookUseCase({
            paymentRepository,
            outboxRepository,
            unitOfWork,
            paystackWebhookVerifier,
            logger,
            clock,
        })
        : null;

    const handleStripeWebhookUseCase = stripeWebhookVerifier
        ? new HandleStripeWebhookUseCase({
            paymentRepository,
            outboxRepository,
            unitOfWork,
            stripeWebhookVerifier,
            logger,
            clock,
        })
        : null;

    // --------------------------------------------------
    // Application services
    // --------------------------------------------------

    const paymentService = new PaymentService({
        createPaymentUseCase,
        refundPaymentUseCase,
        getPaymentByIdUseCase,
        getAllPaymentsUseCase,
    });

    const paymentWebhookService = new PaymentWebhookService({
        handlePaystackWebhookUseCase,
        handleStripeWebhookUseCase,
    });

    // --------------------------------------------------
    // Controllers
    // --------------------------------------------------

    const paymentController = new PaymentController({
        paymentService,
    });

    const paymentWebhookController = new PaymentWebhookController({
        paymentWebhookService,
    });

    // --------------------------------------------------
    // Router
    // --------------------------------------------------

    const router = createPaymentRouter({
        paymentController,
        paymentWebhookController,
    });

    // --------------------------------------------------
    // Public module API
    // --------------------------------------------------

    return {
        router,

        controllers: {
            paymentController,
            paymentWebhookController,
        },

        services: {
            paymentService,
            paymentWebhookService,
        },

        repositories: {
            paymentRepository,
            refundRepository,
        },

        gateways: {
            paystackGateway,
            stripeGateway,
            paymentGatewayFactory,
        },

        useCases: {
            createPaymentUseCase,
            refundPaymentUseCase,
            getPaymentByIdUseCase,
            getAllPaymentsUseCase,
            handlePaystackWebhookUseCase,
            handleStripeWebhookUseCase,
        },

        infrastructure: {
            lockManager,
            unitOfWork,
            idGenerator,
            clock,
            paystackWebhookVerifier,
            stripeWebhookVerifier,
        },
    };
}