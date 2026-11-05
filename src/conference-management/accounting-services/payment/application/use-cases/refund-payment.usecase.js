
import {
    ValidationError,
    NotFoundError,
    GatewayError,
    UnauthorizedError,
    ForbiddenError
} from "../../domain/errors/PaymentErrors.js";
import { RefundPaymentCommand } from "../../domain/commands/RefundPaymentCommand.js";

export class RefundPaymentUseCase {
    constructor({
        paymentRepository,
        refundRepository,
        outboxRepository,
        paymentGatewayFactory,
        lockManager,
        unitOfWork,
        idGenerator,
        clock,
        logger = console,
        metrics,
        auditLogger
    }) {
        if (!paymentRepository) throw new Error("RefundPaymentUseCase requires paymentRepository.");
        if (!refundRepository) throw new Error("RefundPaymentUseCase requires refundRepository.");
        if (!outboxRepository) throw new Error("RefundPaymentUseCase requires outboxRepository.");
        if (!paymentGatewayFactory) throw new Error("RefundPaymentUseCase requires paymentGatewayFactory.");
        if (!lockManager) throw new Error("RefundPaymentUseCase requires lockManager.");
        if (!unitOfWork) throw new Error("RefundPaymentUseCase requires unitOfWork.");
        if (!idGenerator) throw new Error("RefundPaymentUseCase requires idGenerator.");
        if (!clock) throw new Error("RefundPaymentUseCase requires clock.");

        this.paymentRepository = paymentRepository;
        this.refundRepository = refundRepository;
        this.outboxRepository = outboxRepository;
        this.paymentGatewayFactory = paymentGatewayFactory;
        this.lockManager = lockManager;
        this.unitOfWork = unitOfWork;
        this.idGenerator = idGenerator;
        this.clock = clock;
        this.logger = logger;
        this.metrics = metrics;
        this.auditLogger = auditLogger;
    }

    async execute(input) {
        const startedAt = Date.now();
        const command = new RefundPaymentCommand(input);
        const lockKey = `payment:refund:${command.paymentId}`;

        const acquired = await this.lockManager.acquire(lockKey, {
            ttl: 30000
        });

        if (!acquired) {
            throw new ValidationError(
                "Another refund execution for this payment is currently processing."
            );
        }

        try {
            const {
                payment,
                refundRecord,
                refundAmount,
                replay
            } = await this.#reserveAndCreateIntent(command);

            // Never submit a previously successful refund again.
            if (replay) {
                return {
                    success: true,
                    paymentId: payment.id,
                    refundId: refundRecord.id,
                    gatewayRefundId: refundRecord.gatewayRefundId,
                    status: payment.status,
                    amountRefunded: refundRecord.amount
                };
            }

            let gatewayRefund;

            try {
                gatewayRefund = await this.#executeGatewayRefund(
                    payment,
                    refundRecord,
                    refundAmount
                );
            } catch (gatewayError) {
                if (
                    gatewayError.isNetworkTimeout ||
                    gatewayError.statusCode === 504
                ) {
                    this.logger.warn(
                        {
                            refundRecordId: refundRecord.id,
                            error: gatewayError.message
                        },
                        "Refund request timed out. Leaving intent pending for reconciliation."
                    );
                } else {
                    await this.#markIntentFailed(
                        refundRecord.id,
                        gatewayError.message
                    );
                }

                throw gatewayError;
            }

            if (!gatewayRefund?.id) {
                await this.#markIntentFailed(
                    refundRecord.id,
                    "Gateway returned an invalid refund response."
                );

                throw new GatewayError(
                    "Gateway returned an invalid refund response."
                );
            }

            const gatewayStatus = String(
                gatewayRefund.status || "pending"
            ).toLowerCase();

            // Only a confirmed provider success can change the payment.
            if (gatewayStatus === "succeeded") {
                const finalResult = await this.#settleRefundSuccess(
                    payment.id,
                    refundRecord.id,
                    gatewayRefund,
                    command
                );

                this.metrics?.increment?.("payment.refund.success");
                this.metrics?.histogram?.(
                    "payment.refund.duration",
                    Date.now() - startedAt
                );

                await this.auditLogger?.record?.({
                    action: "PAYMENT_REFUNDED",
                    aggregateId: finalResult.payment.id,
                    tenantId: finalResult.payment.tenantId,
                    actorId: command.actor.id,
                    occurredAt: this.clock.now(),
                    metadata: {
                        refundId: finalResult.refund.id,
                        gatewayRefundId: gatewayRefund.id,
                        amount: finalResult.refund.amount
                    }
                });

                return {
                    success: true,
                    paymentId: finalResult.payment.id,
                    refundId: finalResult.refund.id,
                    gatewayRefundId: gatewayRefund.id,
                    status: finalResult.payment.status,
                    amountRefunded: finalResult.refund.amount
                };
            }

            // Explicit terminal provider failures must not settle payment.
            if (
                ["failed", "canceled", "cancelled", "rejected"].includes(
                    gatewayStatus
                )
            ) {
                await this.#markIntentFailed(
                    refundRecord.id,
                    `Gateway refund status: ${gatewayStatus}`
                );

                this.metrics?.increment?.("payment.refund.failure");

                return {
                    success: false,
                    paymentId: payment.id,
                    refundId: refundRecord.id,
                    gatewayRefundId: gatewayRefund.id,
                    status: "failed",
                    amountRefunded: 0
                };
            }

            // Pending, processing and unknown statuses remain unsettled.
            const processingResult =
                await this.#markIntentProcessing(
                    refundRecord.id,
                    gatewayRefund
                );

            this.metrics?.increment?.("payment.refund.pending");

            return {
                success: true,
                paymentId: payment.id,
                refundId: refundRecord.id,
                gatewayRefundId: gatewayRefund.id,
                status: processingResult.status,
                amountRefunded: 0,
                requestedAmount: refundRecord.amount
            };
        } finally {
            await this.lockManager.release(lockKey);
        }
    }

    async #reserveAndCreateIntent(command) {
        return this.unitOfWork.execute(async (trx) => {
            const payment =
                await this.paymentRepository.findByIdForUpdate(
                    command.paymentId,
                    trx
                );

            if (!payment) {
                throw new NotFoundError("Payment not found.");
            }

            this.#authorize(payment, command.actor);

            // Check idempotency before refundable-state validation.
            const existingRefund =
                await this.refundRepository.findByIdempotencyKey(
                    payment.id,
                    command.idempotencyKey,
                    trx
                );

            if (existingRefund) {
                if (existingRefund.status === "succeeded") {
                    return {
                        payment,
                        refundRecord: existingRefund,
                        refundAmount: existingRefund.amount,
                        replay: true
                    };
                }

                throw new ValidationError(
                    `A refund with this idempotency key already exists with status '${existingRefund.status}'.`
                );
            }

            if (!payment.canBeRefunded()) {
                throw new ValidationError(
                    "Payment cannot be refunded in its current state."
                );
            }

            const totalAlreadyRefunded =
                await this.refundRepository.sumActiveRefundsByPaymentId(
                    payment.id,
                    trx
                );

            const remainingBalance =
                payment.amount - totalAlreadyRefunded;

            const refundAmount =
                command.amountMinor ?? remainingBalance;

            if (
                !Number.isSafeInteger(refundAmount) ||
                refundAmount <= 0
            ) {
                throw new ValidationError(
                    "Refund amount must be a positive integer."
                );
            }

            if (refundAmount > remainingBalance) {
                throw new ValidationError(
                    "Refund exceeds remaining refundable balance."
                );
            }

            const refundRecord = {
                id: this.idGenerator.generate(),
                paymentId: payment.id,
                tenantId: payment.tenantId,
                amount: refundAmount,
                currency: payment.currency,
                reason: command.reason,
                reasonCategory: "CUSTOMER_REQUEST",
                gateway: payment.gateway,
                gatewayProvider: payment.gateway,
                status: "pending",
                processedBy: command.actor.id,
                idempotencyKey: command.idempotencyKey,
                metadata: {
                    correlationId: command.correlationId
                },
                createdAt: this.clock.now()
            };

            await this.refundRepository.createRefund(
                refundRecord,
                trx
            );

            return {
                payment,
                refundRecord,
                refundAmount,
                replay: false
            };
        });
    }

    async #executeGatewayRefund(
        payment,
        refundRecord,
        refundAmount
    ) {
        const gateway = this.paymentGatewayFactory.create(
            payment.gateway
        );

        try {
            return await gateway.refund({
                externalReference: payment.externalReference,
                gatewayTransactionId: payment.gatewayTransactionId,
                amount: refundAmount,
                currency: payment.currency,
                idempotencyKey: refundRecord.id,
                metadata: {
                    paymentId: payment.id,
                    refundRecordId: refundRecord.id
                }
            });
        } catch (error) {
            const gatewayError = new GatewayError(
                "Gateway rejected the refund request.",
                { cause: error }
            );

            gatewayError.isNetworkTimeout =
                error.code === "ETIMEDOUT" ||
                error.code === "ECONNRESET";

            gatewayError.statusCode = error.response?.status;

            throw gatewayError;
        }
    }

    async #settleRefundSuccess(
        paymentId,
        refundRecordId,
        gatewayRefund,
        command
    ) {
        return this.unitOfWork.execute(async (trx) => {
            const payment =
                await this.paymentRepository.findByIdForUpdate(
                    paymentId,
                    trx
                );

            const refund =
                await this.refundRepository.findByIdForUpdate(
                    refundRecordId,
                    trx
                );

            if (!payment || !refund) {
                throw new NotFoundError(
                    "Payment or intent record missing during settlement."
                );
            }

            const activeRefundTotal =
                await this.refundRepository.sumActiveRefundsByPaymentId(
                    payment.id,
                    trx
                );

            if (activeRefundTotal > payment.amount) {
                throw new ValidationError(
                    "Terminal integrity check failed: refunds exceed payment amount."
                );
            }

            const remainingBalance =
                payment.amount - activeRefundTotal;

            payment.applyRefund({
                amount: refund.amount,
                remainingBalance,
                gatewayRefundId: gatewayRefund.id,
                processedBy: command.actor.id,
                processedAt: this.clock.now(),
                correlationId: command.correlationId
            });

            refund.status = "succeeded";
            refund.gatewayRefundId = gatewayRefund.id;
            refund.gatewayProvider = gatewayRefund.provider;
            refund.processedAt = this.clock.now();

            await this.paymentRepository.update(payment, trx);
            await this.refundRepository.update(refund, trx);

            for (const event of payment.pullDomainEvents()) {
                await this.outboxRepository.save(event, trx);
            }

            return {
                payment,
                refund
            };
        });
    }

    async #markIntentProcessing(
        refundRecordId,
        gatewayRefund
    ) {
        return this.unitOfWork.execute(async (trx) => {
            const refund =
                await this.refundRepository.findByIdForUpdate(
                    refundRecordId,
                    trx
                );

            if (!refund) {
                throw new NotFoundError(
                    "Refund intent not found while updating processing status."
                );
            }

            refund.status = "processing";
            refund.gatewayRefundId = gatewayRefund.id;

            if (gatewayRefund.provider) {
                refund.gatewayProvider = gatewayRefund.provider;
            }

            await this.refundRepository.update(refund, trx);

            return refund;
        });
    }

    async #markIntentFailed(
        refundRecordId,
        errorReason
    ) {
        try {
            await this.unitOfWork.execute(async (trx) => {
                const refund =
                    await this.refundRepository.findByIdForUpdate(
                        refundRecordId,
                        trx
                    );

                if (refund) {
                    refund.status = "failed";
                    refund.failureReason = errorReason;

                    await this.refundRepository.update(
                        refund,
                        trx
                    );
                }
            });
        } catch (logError) {
            this.logger.error(
                "Failed writing background state failure records",
                logError
            );
        }
    }

    #authorize(payment, actor) {
        if (!actor || !actor.id) {
            throw new UnauthorizedError(
                "Authenticated actor context is required."
            );
        }

        if (
            !Array.isArray(actor.roles) ||
            !actor.roles.includes("admin")
        ) {
            throw new ForbiddenError(
                "Only administrators may issue payment refunds."
            );
        }

        if (
            !actor.tenantId ||
            actor.tenantId !== payment.tenantId
        ) {
            throw new NotFoundError("Payment not found.");
        }
    }
}
