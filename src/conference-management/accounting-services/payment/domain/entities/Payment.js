
// src/conference-management/accounting-services/payment/domain/entities/Payment.js

import { AggregateRoot } from "../../../../../shared/domain/AggregateRoot.js";
import { Money } from "../value-objects/Money.js";
import { PaymentStatus } from "../value-objects/PaymentStatus.js";
import {
    ValidationError,
    UnprocessableEntityError,
} from "../errors/PaymentErrors.js";

import { PaymentCreatedEvent } from "../events/PaymentCreatedEvent.js";
import { PaymentSuccessfulEvent } from "../events/PaymentSuccessfulEvent.js";
import { PaymentReleasedEvent } from "../events/PaymentReleasedEvent.js";


export class Payment extends AggregateRoot {

    constructor(props) {

        super(
            props.id,
            props.version
        );


        // ---------------------------------------------------------
        // Identity / tenancy
        // ---------------------------------------------------------

        this._tenantId =
            props.tenantId;


        this._contextId =
            props.contextId;


        this._contextType =
            props.contextType;


        // ---------------------------------------------------------
        // Money
        // ---------------------------------------------------------

        this._money =
            new Money(
                props.amount,
                props.currency
            );


        // ---------------------------------------------------------
        // Payment state
        // ---------------------------------------------------------

        this._status =
            new PaymentStatus(
                props.status
            );


        // ---------------------------------------------------------
        // Customer / seller
        // ---------------------------------------------------------

        this._userId =
            props.userId || null;


        this._email =
            props.email || null;


        this._sellerId =
            props.sellerId || null;


        // ---------------------------------------------------------
        // Payment gateway
        // ---------------------------------------------------------

        this._gateway =
            props.gateway || null;


        this._externalReference =
            props.externalReference || null;


        this._checkoutUrl =
            props.checkoutUrl || null;


        this._gatewayTransactionId =
            props.gatewayTransactionId || null;


        // ---------------------------------------------------------
        // Payment lifecycle timestamps
        // ---------------------------------------------------------

        this._paidAt =
            props.paidAt || null;


        this._releasedAt =
            props.releasedAt || null;


        this._createdAt =
            props.createdAt || null;


        this._updatedAt =
            props.updatedAt || null;


        // ---------------------------------------------------------
        // Gateway initialization failure information
        // ---------------------------------------------------------

        this._gatewayFailure =
            props.gatewayFailure || null;
    }


    // =============================================================
    // Getters
    // =============================================================

    get tenantId() {
        return this._tenantId;
    }


    get contextId() {
        return this._contextId;
    }


    get contextType() {
        return this._contextType;
    }


    get money() {
        return this._money;
    }


    get amount() {
        return this._money.amount;
    }


    get currency() {
        return this._money.currency;
    }


    get status() {
        return this._status.value;
    }


    get userId() {
        return this._userId;
    }


    get email() {
        return this._email;
    }


    get sellerId() {
        return this._sellerId;
    }


    get gateway() {
        return this._gateway;
    }


    get externalReference() {
        return this._externalReference;
    }


    get checkoutUrl() {
        return this._checkoutUrl;
    }


    get gatewayTransactionId() {
        return this._gatewayTransactionId;
    }


    get gatewayFailure() {
        return this._gatewayFailure;
    }


    get paidAt() {
        return this._paidAt;
    }


    get releasedAt() {
        return this._releasedAt;
    }


    get createdAt() {
        return this._createdAt;
    }


    get updatedAt() {
        return this._updatedAt;
    }


    // =============================================================
    // Factory
    // =============================================================

    static create(cmd) {

        if (!cmd.createdAt) {
            throw new ValidationError(
                "createdAt required"
            );
        }


        if (!cmd.tenantId) {
            throw new ValidationError(
                "tenantId required"
            );
        }


        if (!cmd.contextId) {
            throw new ValidationError(
                "contextId required"
            );
        }


        if (!cmd.contextType) {
            throw new ValidationError(
                "contextType required"
            );
        }


        if (!cmd.gateway) {
            throw new ValidationError(
                "gateway required"
            );
        }


        if (!cmd.email) {
            throw new ValidationError(
                "email required"
            );
        }


        const payment =
            new Payment({

                id:
                    cmd.id,

                version:
                    0,

                tenantId:
                    cmd.tenantId,

                contextId:
                    cmd.contextId,

                contextType:
                    cmd.contextType,

                amount:
                    cmd.amount,

                currency:
                    cmd.currency,

                status:
                    PaymentStatus.PENDING,

                userId:
                    cmd.userId || null,

                email:
                    cmd.email,

                sellerId:
                    cmd.sellerId || null,

                gateway:
                    cmd.gateway,

                createdAt:
                    cmd.createdAt,

                updatedAt:
                    cmd.createdAt,
            });


        payment.addDomainEvent(
            new PaymentCreatedEvent({

                paymentId:
                    payment.id,

                tenantId:
                    payment.tenantId,

                contextId:
                    payment.contextId,

                contextType:
                    payment.contextType,

                amount:
                    payment.amount,

                currency:
                    payment.currency,

                correlationId:
                    cmd.correlationId,

                causationId:
                    cmd.causationId,

                occurredAt:
                    cmd.createdAt,

            })
        );


        return payment;
    }


    // =============================================================
    // Gateway Integration
    // =============================================================

    gatewayMetadata() {

        return {

            paymentId:
                this.id,

            tenantId:
                this.tenantId,

            contextId:
                this.contextId,

            contextType:
                this.contextType,

            userId:
                this.userId,

        };
    }


    markGatewayInitialized({
        externalReference,
        checkoutUrl,
        correlationId,
    }) {

        if (this.status !== PaymentStatus.PENDING) {
            throw new UnprocessableEntityError(
                `Cannot initialize gateway while payment status is '${this.status}'.`
            );
        }


        if (!externalReference) {
            throw new ValidationError(
                "externalReference required"
            );
        }


        this._externalReference =
            externalReference;


        this._checkoutUrl =
            checkoutUrl || null;


        this._updatedAt =
            new Date();


        this._incrementVersion();


        return this;
    }


    markInitializationFailed({
        message,
        code,
        provider,
    }) {

        if (this.status !== PaymentStatus.PENDING) {
            return this;
        }


        this._gatewayFailure = {

            provider:
                provider || this.gateway,

            code:
                code || null,

            message:
                message || "Payment gateway initialization failed",

            occurredAt:
                new Date(),

        };


        /*
         * Keep the payment in CREATED state.
         *
         * CreatePaymentUseCase only attempts gateway initialization
         * while the payment is CREATED. Moving this aggregate to
         * FAILED here would make a transient gateway failure
         * permanently non-retryable.
         */
        this._updatedAt =
            this._gatewayFailure.occurredAt;


        this._incrementVersion();


        return this;
    }


    // =============================================================
    // Payment Lifecycle
    // =============================================================

    markSuccessful({
        gatewayTransactionId,
        paidAt,
        correlationId,
    }) {

        if (this.isSuccessful()) {
            return this;
        }


        if (
            !this.canTransitionTo(
                PaymentStatus.SUCCESSFUL
            )
        ) {

            throw new UnprocessableEntityError(
                `Cannot complete payment while status is '${this.status}'.`
            );
        }


        if (!gatewayTransactionId) {

            throw new ValidationError(
                "gatewayTransactionId required"
            );
        }


        if (!paidAt) {

            throw new ValidationError(
                "paidAt required for audit"
            );
        }


        this._status =
            new PaymentStatus(
                PaymentStatus.SUCCESSFUL
            );


        this._paidAt =
            paidAt;


        this._gatewayTransactionId =
            gatewayTransactionId;


        this._incrementVersion();


        this._updatedAt =
            paidAt;


        this.addDomainEvent(
            new PaymentSuccessfulEvent({

                paymentId:
                    this.id,

                tenantId:
                    this._tenantId,

                contextId:
                    this._contextId,

                contextType:
                    this._contextType,

                amount:
                    this.amount,

                currency:
                    this.currency,

                gatewayTransactionId,

                correlationId:
                    correlationId ||
                    this.currentCorrelationId,

                occurredAt:
                    paidAt,
            })
        );


        return this;
    }


    // =============================================================
    // Escrow Release
    // =============================================================

    release({
        sellerId,
        gatewayTransactionId,
        releasedAt,
        correlationId,
        causationId,
    }) {

        if (this.isReleased()) {
            return this;
        }


        if (
            !this.canTransitionTo(
                PaymentStatus.RELEASED
            )
        ) {

            throw new UnprocessableEntityError(
                `Cannot release payment. Status is '${this.status}'. Expected 'HELD' or 'SUCCESSFUL'.`
            );
        }


        if (!releasedAt) {

            throw new ValidationError(
                "releasedAt required for audit"
            );
        }


        if (!gatewayTransactionId) {

            throw new ValidationError(
                "gatewayTransactionId required for payout"
            );
        }


        this._status =
            new PaymentStatus(
                PaymentStatus.RELEASED
            );


        this._releasedAt =
            releasedAt;


        this._sellerId =
            sellerId ||
            this._sellerId;


        this._gatewayTransactionId =
            gatewayTransactionId;


        this._incrementVersion();


        this._updatedAt =
            releasedAt;


        this.addDomainEvent(
            new PaymentReleasedEvent({

                paymentId:
                    this.id,

                tenantId:
                    this._tenantId,

                contextId:
                    this.contextId,

                contextType:
                    this.contextType,

                sellerId:
                    this._sellerId,

                amountReleased:
                    this._money.amount,

                currency:
                    this._money.currency,

                gatewayTransactionId,

                correlationId:
                    correlationId ||
                    this.currentCorrelationId,

                causationId,

                occurredAt:
                    releasedAt,
            })
        );


        return this;
    }


    // =============================================================
    // State Guards
    // =============================================================

    isSuccessful() {

        return (
            this._status.equals(
                PaymentStatus.SUCCESSFUL
            ) ||
            this._status.equals(
                PaymentStatus.RELEASED
            )
        );
    }


    isReleased() {

        return this._status.equals(
            PaymentStatus.RELEASED
        );
    }


    canTransitionTo(newStatus) {

        const transitions = {

            [PaymentStatus.CREATED]: [

                PaymentStatus.PENDING,

                PaymentStatus.SUCCESSFUL,

                PaymentStatus.FAILED,

                PaymentStatus.CANCELLED,

            ],

            [PaymentStatus.PENDING]: [

                PaymentStatus.HELD,

                PaymentStatus.SUCCESSFUL,

                PaymentStatus.FAILED,

                PaymentStatus.CANCELLED,

            ],

            [PaymentStatus.HELD]: [

                PaymentStatus.RELEASED,

                PaymentStatus.REFUNDED,

                PaymentStatus.PARTIALLY_REFUNDED,

                PaymentStatus.CANCELLED,

            ],

            [PaymentStatus.SUCCESSFUL]: [

                PaymentStatus.HELD,

                PaymentStatus.RELEASED,

                PaymentStatus.REFUNDED,

                PaymentStatus.PARTIALLY_REFUNDED,

            ],

            [PaymentStatus.RELEASED]: [],

            [PaymentStatus.REFUNDED]: [],

            [PaymentStatus.PARTIALLY_REFUNDED]: [

                PaymentStatus.REFUNDED,

                PaymentStatus.RELEASED,

            ],

            [PaymentStatus.FAILED]: [],

            [PaymentStatus.CANCELLED]: [],

        };


        return (
            transitions[this._status.value]
                ?.includes(newStatus) ||
            false
        );
    }


    // =============================================================
    // Application Response
    // =============================================================

    toResponse() {

        return {

            id:
                this.id,

            tenantId:
                this.tenantId,

            contextId:
                this.contextId,

            contextType:
                this.contextType,

            amount:
                this.amount,

            currency:
                this.currency,

            status:
                this.status,

            userId:
                this.userId,

            email:
                this.email,

            sellerId:
                this.sellerId,

            gateway:
                this.gateway,

            externalReference:
                this.externalReference,

            checkoutUrl:
                this.checkoutUrl,

            gatewayTransactionId:
                this.gatewayTransactionId,

            gatewayFailure:
                this.gatewayFailure,

            paidAt:
                this.paidAt,

            releasedAt:
                this.releasedAt,

            createdAt:
                this.createdAt,

            updatedAt:
                this.updatedAt,
        };
    }


    // =============================================================
    // Persistence Rehydration
    // =============================================================

    static fromPersistence(data) {

        return new Payment({

            id:
                data.id,

            version:
                data.version,

            tenantId:
                data.tenant_id,

            contextId:
                data.context_id,

            contextType:
                data.context_type,

            amount:
                data.amount,

            currency:
                data.currency,

            status:
                data.status,

            userId:
                data.user_id,

            email:
                data.email,

            sellerId:
                data.seller_id,

            gateway:
                data.gateway,

            externalReference:
                data.external_reference,

            checkoutUrl:
                data.checkout_url,

            gatewayTransactionId:
                data.gateway_transaction_id,

            gatewayFailure:
                data.gateway_failure,

            paidAt:
                data.paid_at
                    ? new Date(data.paid_at)
                    : null,

            releasedAt:
                data.released_at
                    ? new Date(data.released_at)
                    : null,

            createdAt:
                data.created_at
                    ? new Date(data.created_at)
                    : null,

            updatedAt:
                data.updated_at
                    ? new Date(data.updated_at)
                    : null,
        });
    }
}
