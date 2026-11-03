// settlement/domain/events/SettlementScheduled.js

import { DomainEvent }
    from "../../../../../shared/domain/DomainEvent.js";

export class SettlementScheduled extends DomainEvent {

    constructor({

        settlementId,
        scheduledAt,

    }) {

        super({

            aggregateId: settlementId,
            eventName: "settlement.scheduled",

        });

        this.payload = {

            scheduledAt,

        };

    }

}