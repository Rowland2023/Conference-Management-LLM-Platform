// src/authentication/domain/events/UserLoggedIn.js

import { DomainEvent }
    from "../../../../shared/domain/DomainEvent.js";

export class UserLoggedIn
    extends DomainEvent {

    constructor({

        userId,

        occurredAt = new Date(),

    }) {

        super({

            eventName:
                "authentication.user.logged_in",

            aggregateId:
                userId.toString(),

            occurredAt,

        });

        this.userId =
            userId.toString();

    }

}

