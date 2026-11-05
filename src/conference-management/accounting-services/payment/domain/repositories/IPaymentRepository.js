
// src/conference-management/accounting-services/payment/domain/repositories/IPaymentRepository.js

export class IPaymentRepository {

    /**
     * Persist a new Payment aggregate.
     *
     * @param {Payment} payment
     * @param {Object} options
     * @returns {Promise<void>}
     */
    async save(payment, options = {}) {
        throw new Error(
            "IPaymentRepository.save() must be implemented."
        );
    }

    /**
     * Retrieve payment aggregate by ID.
     *
     * @param {string} paymentId
     * @param {Object} options
     * @returns {Promise<Payment|null>}
     */
    async findById(paymentId, options = {}) {
        throw new Error(
            "IPaymentRepository.findById() must be implemented."
        );
    }

    /**
     * Retrieve payment with database lock.
     * Used for refunds, state transitions and concurrency protection.
     *
     * @param {string} paymentId
     * @param {Object} transaction
     * @returns {Promise<Payment|null>}
     */
    async findByIdForUpdate(paymentId, transaction) {
        throw new Error(
            "IPaymentRepository.findByIdForUpdate() must be implemented."
        );
    }

    /**
     * Find payment using tenant-scoped idempotency key.
     *
     * Prevents duplicate payment creation within a tenant.
     *
     * @param {string} tenantId
     * @param {string} idempotencyKey
     * @param {Object} options
     * @returns {Promise<Payment|null>}
     */
    async findByIdempotencyKey(
        tenantId,
        idempotencyKey,
        options = {}
    ) {
        throw new Error(
            "IPaymentRepository.findByIdempotencyKey() must be implemented."
        );
    }

    /**
     * Find payment by gateway transaction reference.
     *
     * Used by Paystack and Stripe webhooks.
     *
     * @param {string} gatewayTransactionId
     * @param {Object} options
     * @returns {Promise<Payment|null>}
     */
    async findByGatewayTransactionId(
        gatewayTransactionId,
        options = {}
    ) {
        throw new Error(
            "IPaymentRepository.findByGatewayTransactionId() must be implemented."
        );
    }

    /**
     * Update existing payment aggregate.
     *
     * @param {Payment} payment
     * @param {Object} options
     * @returns {Promise<void>}
     */
    async update(payment, options = {}) {
        throw new Error(
            "IPaymentRepository.update() must be implemented."
        );
    }

    /**
     * Check payment existence without loading aggregate.
     *
     * @param {string} paymentId
     * @param {Object} options
     * @returns {Promise<boolean>}
     */
    async exists(paymentId, options = {}) {
        throw new Error(
            "IPaymentRepository.exists() must be implemented."
        );
    }
}
