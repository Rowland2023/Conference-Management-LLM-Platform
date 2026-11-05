
// src/conference-management/accounting-services/payment/infrastructure/persistence/repositories/PostgresPaymentRepository.js

import { IPaymentRepository } from "../../../domain/repositories/IPaymentRepository.js";
import {
    ConflictError,
    InternalError,
} from "../../../domain/errors/PaymentErrors.js";

export class PostgresPaymentRepository extends IPaymentRepository {
    constructor({ db, paymentMapper }) {
        super();

        if (!db || typeof db.raw !== "function") {
            throw new InternalError(
                "PostgresPaymentRepository requires a valid Knex database instance."
            );
        }

        if (!paymentMapper || typeof paymentMapper.toDomain !== "function") {
            throw new InternalError(
                "PostgresPaymentRepository requires a valid payment mapper."
            );
        }

        this.db = db;
        this.paymentMapper = paymentMapper;
    }

    // ============================================================
    // DATABASE / TRANSACTION RESOLUTION
    // ============================================================

    _client(options = {}) {
        const transaction = options?.transaction ?? options;

        if (transaction && typeof transaction.raw === "function") {
            return transaction;
        }

        return this.db;
    }

    // ============================================================
    // KNEX QUERY EXECUTION
    // ============================================================

    async _query(sql, values = [], options = {}) {
        const client = this._client(options);

        if (!client || typeof client.raw !== "function") {
            throw new InternalError(
                "A valid Knex database instance or transaction is required."
            );
        }

        // Convert PostgreSQL positional placeholders ($1, $2, ...)
        // into Knex positional placeholders (?).
        //
        // Bindings must follow the order in which placeholders
        // appear in the SQL statement, not their original indexes.

        const bindings = [];

        const knexSql = sql.replace(/\$(\d+)/g, (_, position) => {
            const index = Number(position) - 1;

            if (
                !Number.isInteger(index) ||
                index < 0 ||
                index >= values.length
            ) {
                throw new InternalError(
                    `Invalid SQL parameter position: $${position}.`
                );
            }

            bindings.push(values[index]);

            return "?";
        });

        return client.raw(knexSql, bindings);
    }

    // ============================================================
    // CREATE
    // ============================================================

    async save(payment, options = {}) {
        if (!payment?.id) {
            throw new InternalError(
                "Cannot save a payment without an ID."
            );
        }

        if (!payment.tenantId) {
            throw new InternalError(
                "Cannot save a payment without a tenant ID."
            );
        }

        if (!payment.idempotencyKey) {
            throw new InternalError(
                "Cannot save a payment without an idempotency key."
            );
        }

        const query = `
            INSERT INTO payments (
                id,
                version,
                tenant_id,
                context_id,
                context_type,
                idempotency_key,
                amount,
                currency,
                status,
                user_id,
                email,
                seller_id,
                gateway,
                external_reference,
                checkout_url,
                gateway_transaction_id,
                gateway_failure,
                paid_at,
                released_at,
                created_at,
                updated_at
            )
            VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15,
                $16, $17, $18, $19, $20,
                $21
            )
            RETURNING *
        `;

        const values = [
            payment.id,
            payment.version ?? 0,
            payment.tenantId,
            payment.contextId,
            payment.contextType,
            payment.idempotencyKey,
            payment.amount,
            payment.currency,
            payment.status,
            payment.userId,
            payment.email,
            payment.sellerId,
            payment.gateway,
            payment.externalReference,
            payment.checkoutUrl,
            payment.gatewayTransactionId,
            payment.gatewayFailure
                ? JSON.stringify(payment.gatewayFailure)
                : null,
            payment.paidAt,
            payment.releasedAt,
            payment.createdAt,
            payment.updatedAt,
        ];

        const result = await this._query(query, values, options);

        if (!result.rows?.[0]) {
            throw new InternalError(
                "Payment insert completed without returning a record."
            );
        }

        return this.paymentMapper.toDomain(result.rows[0]);
    }

    // ============================================================
    // FIND BY ID
    // ============================================================

    async findById(paymentId, options = {}) {
        const query = `
            SELECT *
            FROM payments
            WHERE id = $1
            LIMIT 1
        `;

        const result = await this._query(
            query,
            [paymentId],
            options
        );

        if (!result.rows?.length) {
            return null;
        }

        return this.paymentMapper.toDomain(result.rows[0]);
    }

    // ============================================================
    // FIND BY ID + PESSIMISTIC LOCK
    // ============================================================

    async findByIdForUpdate(paymentId, transaction) {
        if (!transaction || typeof transaction.raw !== "function") {
            throw new InternalError(
                "Pessimistic row locking requires an active Knex transaction."
            );
        }

        const query = `
            SELECT *
            FROM payments
            WHERE id = $1
            FOR UPDATE
        `;

        const result = await this._query(
            query,
            [paymentId],
            transaction
        );

        if (!result.rows?.length) {
            return null;
        }

        return this.paymentMapper.toDomain(result.rows[0]);
    }

    // ============================================================
    // FIND BY TENANT-SCOPED IDEMPOTENCY KEY
    // ============================================================

    async findByIdempotencyKey(
        tenantId,
        idempotencyKey,
        options = {}
    ) {
        if (!tenantId) {
            throw new InternalError(
                "A tenant ID is required for idempotency lookup."
            );
        }

        if (!idempotencyKey) {
            throw new InternalError(
                "An idempotency key is required."
            );
        }

        const query = `
            SELECT *
            FROM payments
            WHERE tenant_id = $1
              AND idempotency_key = $2
            LIMIT 1
        `;

        const result = await this._query(
            query,
            [tenantId, idempotencyKey],
            options
        );

        if (!result.rows?.length) {
            return null;
        }

        return this.paymentMapper.toDomain(result.rows[0]);
    }

    // ============================================================
    // FIND BY GATEWAY TRANSACTION ID
    // ============================================================

    async findByGatewayTransactionId(
        gatewayTransactionId,
        options = {}
    ) {
        if (!gatewayTransactionId) {
            return null;
        }

        const query = `
            SELECT *
            FROM payments
            WHERE gateway_transaction_id = $1
            LIMIT 1
        `;

        const result = await this._query(
            query,
            [gatewayTransactionId],
            options
        );

        if (!result.rows?.length) {
            return null;
        }

        return this.paymentMapper.toDomain(result.rows[0]);
    }

    // ============================================================
    // UPDATE
    // ============================================================

    async update(payment, options = {}) {
        if (!payment?.id) {
            throw new InternalError(
                "Cannot update a payment without an ID."
            );
        }

        const currentVersion = payment.version ?? 0;

        if (
            !Number.isSafeInteger(currentVersion) ||
            currentVersion < 0
        ) {
            throw new InternalError(
                "Payment version must be a non-negative safe integer."
            );
        }

        const query = `
            UPDATE payments
            SET
                version = $2,
                status = $3,
                seller_id = $4,
                gateway_transaction_id = $5,
                external_reference = $6,
                checkout_url = $7,
                gateway_failure = $8,
                paid_at = $9,
                released_at = $10,
                updated_at = $11
            WHERE id = $1
              AND version = $12
            RETURNING *
        `;

        const values = [
            payment.id,
            currentVersion + 1,
            payment.status,
            payment.sellerId,
            payment.gatewayTransactionId,
            payment.externalReference,
            payment.checkoutUrl,
            payment.gatewayFailure
                ? JSON.stringify(payment.gatewayFailure)
                : null,
            payment.paidAt,
            payment.releasedAt,
            payment.updatedAt,
            currentVersion,
        ];

        const result = await this._query(
            query,
            values,
            options
        );

        if (!result.rows?.[0]) {
            throw new ConflictError(
                `Optimistic concurrency failure: Payment aggregate ${payment.id} was modified by another transaction.`
            );
        }

        return this.paymentMapper.toDomain(result.rows[0]);
    }

    // ============================================================
    // EXISTS
    // ============================================================

    async exists(paymentId, options = {}) {
        const query = `
            SELECT EXISTS (
                SELECT 1
                FROM payments
                WHERE id = $1
            ) AS exists
        `;

        const result = await this._query(
            query,
            [paymentId],
            options
        );

        return result.rows?.[0]?.exists === true;
    }
}
