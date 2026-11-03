// src/authentication/domain/events/UserRegistered.js

import { DomainEvent }
    from "../../../../shared/domain/DomainEvent.js";

export class UserRegistered
    extends DomainEvent {

    constructor({

        userId,

        email,

        occurredAt = new Date(),

    }) {

        super({

            eventName:
                "authentication.user.registered",

            aggregateId:
                userId.toString(),

            occurredAt,

        });

        this.userId =
            userId.toString();

        this.email =
            email.toString();

    }

}

