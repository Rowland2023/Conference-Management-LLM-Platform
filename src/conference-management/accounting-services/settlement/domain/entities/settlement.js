// settlement/domain/entities/Settlement.js

import { randomUUID } from "crypto";

import { AggregateRoot }
    from "../../../../../shared/domain/AggregateRoot.js";

import { SettlementStatus }
    from "../value-objects/settlement_status.js";

import { SettlementCreated }
    from "../events/SettlementCreated.js";

import { SettlementScheduled }
    from "../events/SettlementScheduled.js";

import { SettlementCompleted }
    from "../events/SettlementCompleted.js";

import { SettlementFailed }
    from "../events/SettlementFailed.js";

import { SettlementCancelled }
    from "../events/SettlementCancelled.js";

export class Settlement extends AggregateRoot {

    constructor({

        id = randomUUID(),

        merchantId,

        amount,

        currency,

        method,

        scheduledAt = null,

        status = SettlementStatus.PENDING,

    }) {

        super();

        this.id = id;
        this.merchantId = merchantId;
        this.amount = amount;
        this.currency = currency;
        this.method = method;
        this.scheduledAt = scheduledAt;
        this.status = status;

    }

    create() {

        this.addDomainEvent(

            new SettlementCreated({

                settlementId: this.id,
                merchantId: this.merchantId,
                amount: this.amount,
                currency: this.currency,
                method: this.method,

            })

        );

    }

    schedule(scheduledAt) {

        if (this.status !== SettlementStatus.PENDING) {

            throw new Error(
                "Only pending settlements can be scheduled."
            );

        }

        this.scheduledAt = scheduledAt;
        this.status = SettlementStatus.SCHEDULED;

        this.addDomainEvent(

            new SettlementScheduled({

                settlementId: this.id,
                scheduledAt,

            })

        );

    }

    complete() {

        if (
            this.status !== SettlementStatus.SCHEDULED &&
            this.status !== SettlementStatus.PROCESSING
        ) {

            throw new Error(
                "Only scheduled or processing settlements can be completed."
            );

        }

        this.status = SettlementStatus.COMPLETED;

        this.addDomainEvent(

            new SettlementCompleted({

                settlementId: this.id,
                completedAt: new Date(),

            })

        );

    }

    fail(reason) {

        if (
            this.status === SettlementStatus.COMPLETED ||
            this.status === SettlementStatus.CANCELLED
        ) {

            throw new Error(
                "Completed or cancelled settlements cannot fail."
            );

        }

        this.status = SettlementStatus.FAILED;

        this.addDomainEvent(

            new SettlementFailed({

                settlementId: this.id,
                reason,

            })

        );

    }

    cancel(reason) {

        if (this.status === SettlementStatus.COMPLETED) {

            throw new Error(
                "Completed settlements cannot be cancelled."
            );

        }

        if (this.status === SettlementStatus.CANCELLED) {

            throw new Error(
                "Settlement is already cancelled."
            );

        }

        this.status = SettlementStatus.CANCELLED;

        this.addDomainEvent(

            new SettlementCancelled({

                settlementId: this.id,
                reason,

            })

        );

    }

}