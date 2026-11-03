// settlement/domain/events/SettlementCompleted.js

import { DomainEvent }
    from "../../../../../shared/domain/DomainEvent.js";

export class SettlementCompleted extends DomainEvent {

    constructor({

        settlementId,
        completedAt,

    }) {

        super({

            aggregateId: settlementId,
            eventName: "settlement.completed",

        });

        this.payload = {

            completedAt,

        };

    }

}