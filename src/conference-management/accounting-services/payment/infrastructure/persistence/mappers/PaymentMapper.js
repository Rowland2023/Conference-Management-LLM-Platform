
import { Payment } from "../../../domain/entities/Payment.js";
import { PaymentStatus } from "../../../domain/value-objects/PaymentStatus.js";
import { InternalError } from "../../../domain/errors/PaymentErrors.js";

export class PaymentMapper {
    static toDomain(raw) {
        if (!raw) {
            return null;
        }

        if (!raw.id) {
            throw new InternalError("Payment row missing ID.");
        }

        const amount = Number(raw.amount);

        if (!Number.isSafeInteger(amount) || amount < 0) {
            throw new InternalError(
                `Invalid payment amount in DB: ${raw.amount}`
            );
        }

        return new Payment({
            id: raw.id,
            version: raw.version ?? 0,
            tenantId: raw.tenant_id ?? null,
            contextId: raw.context_id ?? raw.booking_id ?? null,
            idempotencyKey: raw.idempotency_key ?? null,
            amount,
            currency: raw.currency,
            status: PaymentStatus.fromDb(raw.status).value,

            userId: raw.user_id ?? null,
            email: raw.email ?? null,
            sellerId: raw.seller_id ?? null,

            gateway: raw.gateway ?? null,
            externalReference: raw.external_reference ?? null,
            checkoutUrl: raw.checkout_url ?? null,
            gatewayTransactionId: raw.gateway_transaction_id ?? null,
            gatewayFailure: raw.gateway_failure ?? null,

            paidAt: raw.paid_at ? new Date(raw.paid_at) : null,
            releasedAt: raw.released_at ? new Date(raw.released_at) : null,
            createdAt: raw.created_at ? new Date(raw.created_at) : null,
            updatedAt: raw.updated_at ? new Date(raw.updated_at) : null,
        });
    }

    static toPersistence(entity) {
        if (!entity) {
            return null;
        }

        return {
            id: entity.id,
            version: entity.version,
            tenant_id: entity.tenantId,
            context_id: entity.contextId,
            idempotency_key: entity.idempotencyKey ?? null,
            amount: entity.amount,
            currency: entity.currency,
            status: entity.status,

            user_id: entity.userId,
            email: entity.email,
            seller_id: entity.sellerId,

            gateway: entity.gateway,
            external_reference: entity.externalReference,
            checkout_url: entity.checkoutUrl,
            gateway_transaction_id: entity.gatewayTransactionId,
            gateway_failure: entity.gatewayFailure,

            paid_at: entity.paidAt,
            released_at: entity.releasedAt,
            created_at: entity.createdAt,
            updated_at: entity.updatedAt,
        };
    }
}
