// reconciliation/domain/events/DiscrepancyResolved.js

import { DomainEvent } from "../../../../../shared/domain/DomainEvent.js";

export class DiscrepancyResolved extends DomainEvent {

    constructor({

        reconciliationId,

        discrepancyId,

        resolvedBy,

    }) {

        super({

            aggregateId: reconciliationId,

            eventName: "reconciliation.discrepancy_resolved",

            payload: {

                discrepancyId,

                resolvedBy,

            },

        });

    }

}