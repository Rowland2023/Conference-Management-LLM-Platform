// tax/domain/events/TaxCalculated.js

import { DomainEvent }
    from "../../../../../shared/domain/DomainEvent.js";

export class TaxCalculated extends DomainEvent {

    constructor({

        taxId,

        taxpayerId,

        transactionId,

        taxType,

        taxableAmount,

        taxAmount,

        currency,

    }) {

        super({

            eventName: "tax.calculated",

            aggregateId: taxId,

        });

        this.taxpayerId =
            taxpayerId;

        this.transactionId =
            transactionId;

        this.taxType =
            taxType;

        this.taxableAmount =
            taxableAmount;

        this.taxAmount =
            taxAmount;

        this.currency =
            currency;

    }

}