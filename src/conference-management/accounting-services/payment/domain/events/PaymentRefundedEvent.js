import { DomainEvent } from "../../../../../shared/domain/DomainEvent.js";
import { ValidationError } from "../errors/PaymentErrors.js";

export class PaymentRefundedEvent extends DomainEvent {
    constructor({
        paymentId,
        tenantId,
        contextId,
        contextType,
        amountRefunded,
        remainingBalance,
        currency,
        status,
        processedBy,
        gatewayRefundId = null,
        occurredAt = new Date(),
        correlationId = null,
        causationId = null,
    }) {
        super({
            eventName: "payment.refunded",
            aggregateId: paymentId,
            occurredAt: occurredAt instanceof Date
                ? occurredAt
                : new Date(occurredAt),
            correlationId,
            causationId,
        });

        if (!paymentId) {
            throw new ValidationError("Payment ID required.");
        }

        if (!contextId || !contextType) {
            throw new ValidationError("Payment context is required.");
        }

        if (!Number.isSafeInteger(amountRefunded) || amountRefunded <= 0) {
            throw new ValidationError(
                "Refund amount must be a positive integer in minor units.",
            );
        }

        if (
            !Number.isSafeInteger(remainingBalance) ||
            remainingBalance < 0
        ) {
            throw new ValidationError(
                "Remaining balance must be a non-negative integer in minor units.",
            );
        }

        if (!["PARTIALLY_REFUNDED", "REFUNDED"].includes(status)) {
            throw new ValidationError("Invalid refund state.");
        }

        if (typeof currency !== "string" || !/^[A-Z]{3}$/i.test(currency)) {
            throw new ValidationError("Invalid currency code.");
        }

        this.payload = {
            paymentId,
            tenantId,
            contextId,
            contextType,
            amountRefunded,
            remainingBalance,
            currency: currency.toUpperCase(),
            status,
            processedBy,
            gatewayRefundId,
        };

        this.freezeEvent();
    }

    toJSON() {
        return {
            eventName: this.metadata.eventName,
            version: this.metadata.eventVersion,
            metadata: this.metadata,
            payload: this.payload,
        };
    }
}
