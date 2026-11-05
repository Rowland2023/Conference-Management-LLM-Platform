
import { ValidationError, GatewayError } from "../../domain/errors/PaymentErrors.js";
import { Payment } from "../../domain/entities/Payment.js";

export class CreatePaymentUseCase {
    /**
     * @param {Object} deps
     * @param {import('../../ports/ILogger.js').ILogger} deps.logger
     * @param {import('../../ports/IUnitOfWork.js').UnitOfWork} deps.unitOfWork
     * @param {import('../../ports/IPaymentRepository.js').IPaymentRepository} deps.paymentRepository
     * @param {import('../../ports/IOutboxRepository.js').IOutboxRepository} deps.outboxRepository
     * @param {import('../../ports/IIdGenerator.js').IIdGenerator} deps.idGenerator
     * @param {import('../../ports/IClock.js').IClock} deps.clock
     * @param {import('../../ports/IPaymentGatewayFactory.js').IPaymentGatewayFactory} deps.paymentGatewayFactory
     */
    constructor(deps) {
        Object.assign(this, deps);
    }

    async execute(input, context) {
        const txLogger = this.logger.child({
            correlationId: context?.correlationId,
            tenantId: input.tenantId,
            idempotencyKey: input.idempotencyKey
        });

        let payment = await this._loadOrCreate(input, context, txLogger);

        if (payment.status === "PENDING") {
            payment = await this._initializeGateway(payment, context, txLogger);
        } else {
            txLogger.info("Returning existing payment state", {
                paymentId: payment.id,
                status: payment.status
            });
        }

        return payment.toResponse();
    }

    async _loadOrCreate(input, context, txLogger) {
        try {
            return await this.unitOfWork.execute(async (trx) => {
                const existing = await this.paymentRepository.findByIdempotencyKey(
                    input.tenantId,
                    input.idempotencyKey,
                    trx
                );

                if (existing) {
                    txLogger.info(
                        "Idempotent match located: returning persistent state",
                        { paymentId: existing.id }
                    );

                    return existing;
                }

                const payment = Payment.create({
                    id: this.idGenerator.generate(),
                    ...input,
                    createdAt: this.clock.now()
                }, context);

                txLogger.info(
                    "Creating new payment aggregate mapping",
                    { paymentId: payment.id }
                );

                await this.paymentRepository.save(payment, trx);
                await this._flushEvents(payment, trx);

                return payment;
            });
        } catch (error) {
            if (this._isUniqueViolation(error)) {
                return this._handleConcurrentRequest(input, txLogger);
            }

            throw error;
        }
    }

    async _initializeGateway(payment, context, txLogger) {
        const gatewayLogger = txLogger.child({
            paymentId: payment.id,
            gateway: payment.gateway
        });

        const gateway = this.paymentGatewayFactory.create(payment.gateway);

        let session;

        try {
            session = await gateway.initializeTransaction({
                reference: payment.id,
                amount: payment.amount,
                currency: payment.currency,
                email: payment.email,
                metadata: payment.gatewayMetadata()
            });
        } catch (error) {
            gatewayLogger.error("Gateway initialization failed", error);

            const result = await this.unitOfWork.execute(async (trx) => {
                const fresh = await this.paymentRepository.findByIdForUpdate(
                    payment.id,
                    trx
                );

                if (!fresh) {
                    throw new ValidationError(
                        `Payment ${payment.id} could not be found during gateway failure handling`
                    );
                }

                // A concurrent request may already have changed the payment.
                if (fresh.status !== "PENDING") {
                    gatewayLogger.warn(
                        "Payment state updated concurrently during gateway initialization failure",
                        { concurrentStatus: fresh.status }
                    );

                    return {
                        payment: fresh,
                        initializationFailed: false
                    };
                }

                fresh.markInitializationFailed({
                    message: error.message,
                    code: error.code,
                    provider: fresh.gateway
                }, context);

                await this.paymentRepository.update(fresh, trx);
                await this._flushEvents(fresh, trx);

                // Return normally so the database transaction can commit.
                return {
                    payment: fresh,
                    initializationFailed: true
                };
            });

            // Throw only after the transaction has committed.
            if (result.initializationFailed) {
                throw new GatewayError(
                    `Payment initialization failed via ${payment.gateway}: ${error.message}`
                );
            }

            return result.payment;
        }

        return await this.unitOfWork.execute(async (trx) => {
            const fresh = await this.paymentRepository.findByIdForUpdate(
                payment.id,
                trx
            );

            if (!fresh) {
                throw new ValidationError(
                    `Payment ${payment.id} could not be found during gateway initialization`
                );
            }

            // Do not overwrite a state changed by another request.
            if (fresh.status !== "PENDING") {
                gatewayLogger.warn(
                    "Payment mutated concurrently prior to committing session details",
                    { concurrentStatus: fresh.status }
                );

                return fresh;
            }

            fresh.markGatewayInitialized({
                externalReference: session.reference,
                checkoutUrl: session.checkoutUrl
            }, context);

            await this.paymentRepository.update(fresh, trx);
            await this._flushEvents(fresh, trx);

            gatewayLogger.info(
                "Payment gateway integration transaction initialized"
            );

            return fresh;
        });
    }

    async _handleConcurrentRequest(input, txLogger) {
        txLogger.warn(
            "Unique constraint violation caught; resolving concurrent database block"
        );

        const concurrentRecord =
            await this.paymentRepository.findByIdempotencyKey(
                input.tenantId,
                input.idempotencyKey
            );

        if (!concurrentRecord) {
            throw new ValidationError(
                "This payment request is currently being processed by a concurrent thread. Please verify your transaction history."
            );
        }

        return concurrentRecord;
    }

    async _flushEvents(aggregate, trx) {
        const events = aggregate.pullDomainEvents();

        if (events.length === 0) {
            return;
        }

        for (const event of events) {
            await this.outboxRepository.save(event, trx);
        }
    }

    _isUniqueViolation(error) {
        return (
            error?.code === "23505" ||
            /unique|duplicate/i.test(error?.message || "")
        );
    }
}
