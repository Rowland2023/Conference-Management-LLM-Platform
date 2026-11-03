// tax/domain/events/TaxRecorded.js

import { DomainEvent }
    from "../../../../../shared/domain/DomainEvent.js";

export class TaxRecorded extends DomainEvent {

    constructor({

        taxId,

        transactionId,

    }) {

        super({

            eventName: "tax.recorded",

            aggregateId: taxId,

        });

        this.transactionId =
            transactionId;

    }

}