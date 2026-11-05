// src/conference-management/accounting-services/payment/infrastructure/persistence/repositories/PostgresRefundRepository.js

export class PostgresRefundRepository {
    constructor({ db }) {
        if (!db) {
            throw new Error(
                "PostgresRefundRepository requires database connection."
            );
        }

        this.db = db;
    }

    #toDomain(row) {
        if (!row) return null;

        return {
            id: row.id,
            paymentId: row.payment_id,
            amount: Number(row.amount_minor),
            currency: row.currency,
            reasonCategory: row.reason_category,
            reason: row.reason,
            processedBy: row.processed_by_user_id,
            status: row.status,
            gatewayRefundId: row.gateway_refund_id,
            gatewayProvider: row.gateway_provider,
            failureReason: row.error_message,
            idempotencyKey: row.idempotency_key,
            metadata: row.metadata || {},
            processedAt: row.processed_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    async createRefund(refund, trx = this.db) {
        const [row] = await trx("refunds")
            .insert({
                id: refund.id,
                payment_id: refund.paymentId,
                amount_minor: refund.amount,
                currency: refund.currency,
                reason_category:
                    refund.reasonCategory || "CUSTOMER_REQUEST",
                reason: refund.reason || null,
                processed_by_user_id: refund.processedBy || null,
                status: String(refund.status || "pending").toLowerCase(),
                gateway_refund_id: refund.gatewayRefundId || null,
                gateway_provider:
                    refund.gatewayProvider || refund.gateway || null,
                idempotency_key: refund.idempotencyKey,
                metadata: refund.metadata || {},
                processed_at: refund.processedAt || null,
                created_at: refund.createdAt || new Date(),
                updated_at: new Date(),
            })
            .returning("*");

        return this.#toDomain(row);
    }

    // Backward-compatible method name.
    async save(refund, trx = this.db) {
        return this.createRefund(refund, trx);
    }

    async findById(id, trx = this.db) {
        const row = await trx("refunds")
            .where({ id })
            .first();

        return this.#toDomain(row);
    }

    async findByIdForUpdate(id, trx) {
        if (!trx) {
            throw new Error(
                "findByIdForUpdate requires an active transaction."
            );
        }

        const row = await trx("refunds")
            .where({ id })
            .forUpdate()
            .first();

        return this.#toDomain(row);
    }

    async findByIdempotencyKey(paymentId, idempotencyKey, trx = this.db) {
        const row = await trx("refunds")
            .where({
                payment_id: paymentId,
                idempotency_key: idempotencyKey,
            })
            .first();

        return this.#toDomain(row);
    }

    async findByPaymentId(paymentId, trx = this.db) {
        const rows = await trx("refunds")
            .where({ payment_id: paymentId })
            .orderBy("created_at", "desc");

        return rows.map((row) => this.#toDomain(row));
    }

    async sumActiveRefundsByPaymentId(paymentId, trx = this.db) {
        const result = await trx("refunds")
            .where({ payment_id: paymentId })
            .whereIn("status", [
                "pending",
                "processing",
                "succeeded",
            ])
            .sum({ total: "amount_minor" })
            .first();

        const total = Number(result?.total || 0);

        if (!Number.isSafeInteger(total)) {
            throw new Error(
                "Refund total exceeds JavaScript's safe integer range."
            );
        }

        return total;
    }

    async update(refund, trx = this.db) {
        const [row] = await trx("refunds")
            .where({ id: refund.id })
            .update({
                status: String(refund.status).toLowerCase(),
                gateway_refund_id: refund.gatewayRefundId || null,
                gateway_provider: refund.gatewayProvider || null,
                error_message: refund.failureReason || null,
                processed_at: refund.processedAt || null,
                metadata: refund.metadata || {},
                updated_at: new Date(),
            })
            .returning("*");

        if (!row) {
            throw new Error(
                `Refund ${refund.id} could not be updated.`
            );
        }

        return this.#toDomain(row);
    }
}