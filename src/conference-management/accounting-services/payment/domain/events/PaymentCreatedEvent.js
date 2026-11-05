
import { DomainEvent } from "../../../../../shared/domain/DomainEvent.js";
import { ValidationError } from "../errors/PaymentErrors.js";

export class PaymentCreatedEvent extends DomainEvent {
    constructor({
        id,
        paymentId,
        bookingId = null,
        contextId,
        contextType,
        tenantId = null,
        userId = null,
        amount,
        currency,
        gateway = null,
        email,
        idempotencyKey,
        correlationId = null,
        causationId = null,
        createdAt = new Date(),
    }) {
        super({
            eventName: "payment.created",
            aggregateId: paymentId,
            eventId: id,
            occurredAt: createdAt instanceof Date
                ? createdAt
                : new Date(createdAt),
            correlationId,
            causationId,
        });

        const resolvedContextId = contextId || bookingId;

        if (
            typeof resolvedContextId !== "string" ||
            !resolvedContextId.trim()
        ) {
            throw new ValidationError("Payment context ID is required.");
        }

        if (
            typeof contextType !== "string" ||
            !contextType.trim()
        ) {
            throw new ValidationError("Payment context type is required.");
        }

        if (!paymentId || typeof paymentId !== "string") {
            throw new ValidationError("Payment ID is required.");
        }

        if (!tenantId && !userId) {
            throw new ValidationError(
                "Either tenantId or userId is required."
            );
        }

        if (!Number.isSafeInteger(amount) || amount <= 0) {
            throw new ValidationError(
                "Payment amount must be a positive integer in minor units."
            );
        }

        if (
            typeof currency !== "string" ||
            !/^[A-Z]{3}$/i.test(currency)
        ) {
            throw new ValidationError(
                "Invalid currency code format. Must be ISO 3-letter code."
            );
        }

        if (
            typeof email !== "string" ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            throw new ValidationError("A valid customer email is required.");
        }

        if (
            typeof idempotencyKey !== "string" ||
            !idempotencyKey.trim()
        ) {
            throw new ValidationError("Idempotency key is required.");
        }

        this.payload = {
            paymentId,
            bookingId: bookingId || resolvedContextId,
            contextId: resolvedContextId,
            contextType,
            tenantId,
            userId,
            amount,
            currency: currency.toUpperCase(),
            gateway,
            email,
            idempotencyKey,
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