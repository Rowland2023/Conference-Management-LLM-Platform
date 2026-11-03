// src/authentication/domain/events/PasswordChanged.js

import { DomainEvent }
    from "../../../../shared/domain/DomainEvent.js";

export class PasswordChanged
    extends DomainEvent {

    constructor({

        userId,

        occurredAt = new Date(),

    }) {

        super({

            eventName:
                "authentication.user.password_changed",

            aggregateId:
                userId.toString(),

            occurredAt,

        });

        this.userId =
            userId.toString();

    }

}

