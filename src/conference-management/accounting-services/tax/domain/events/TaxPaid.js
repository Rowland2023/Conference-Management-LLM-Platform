// tax/domain/events/TaxPaid.js

import { DomainEvent }
    from "../../../../../shared/domain/DomainEvent.js";

export class TaxPaid extends DomainEvent {

    constructor({

        taxId,

        paymentReference,

        paidAt,

    }) {

        super({

            eventName: "tax.paid",

            aggregateId: taxId,

        });

        this.paymentReference =
            paymentReference;

        this.paidAt =
            paidAt;

    }

}