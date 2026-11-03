// tax/domain/entities/TaxAssessment.js

import { randomUUID }
    from "crypto";

import { AggregateRoot }
    from "../../../../../shared/domain/AggregateRoot.js";

import { TaxStatus }
    from "../value-objects/TaxStatus.js";

import { TaxCalculated }
    from "../events/TaxCalculated.js";

import { TaxRecorded }
    from "../events/TaxRecorded.js";

import { TaxPaid }
    from "../events/TaxPaid.js";


export class TaxAssessment extends AggregateRoot {

    constructor({

        id = randomUUID(),

        transactionId,

        taxpayerId,

        taxType,

        taxableAmount,

        taxAmount,

        currency,

        status = TaxStatus.CALCULATED,

    }) {

        super();

        this.id = id;

        this.transactionId = transactionId;

        this.taxpayerId = taxpayerId;

        this.taxType = taxType;

        this.taxableAmount = taxableAmount;

        this.taxAmount = taxAmount;

        this.currency = currency;

        this.status = status;

    }


    calculate() {

        this.status =
            TaxStatus.CALCULATED;

        this.addDomainEvent(

            new TaxCalculated({

                taxId:
                    this.id,

                taxpayerId:
                    this.taxpayerId,

                transactionId:
                    this.transactionId,

                taxType:
                    this.taxType,

                taxableAmount:
                    this.taxableAmount,

                taxAmount:
                    this.taxAmount,

                currency:
                    this.currency,

            })

        );

    }


    record() {

        this.status =
            TaxStatus.RECORDED;

        this.addDomainEvent(

            new TaxRecorded({

                taxId:
                    this.id,

                transactionId:
                    this.transactionId,

            })

        );

    }


    pay({

        paymentReference,

        paidAt = new Date(),

    }) {

        this.status =
            TaxStatus.PAID;

        this.addDomainEvent(

            new TaxPaid({

                taxId:
                    this.id,

                paymentReference,

                paidAt,

            })

        );

    }

}