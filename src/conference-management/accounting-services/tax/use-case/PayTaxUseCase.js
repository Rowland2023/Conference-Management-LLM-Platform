import { CommandUseCase }
    from "../../shared/application/use-case/CommandUseCase.js";

import { CommandResult }
    from "../../shared/application/dto/CommandResult.js";

import { TaxResponseDTO }
    from "../dto/TaxResponseDTO.js";


export class PayTaxUseCase extends CommandUseCase {

    constructor({

        taxRepository,

        transactionManager,

        eventBus,

        logger,

    }) {

        super({

            transactionManager,

            eventBus,

            logger,

        });

        this.taxRepository =
            taxRepository;

    }


    async doExecute(command, tx) {

        //--------------------------------------------------
        // Load Aggregate
        //--------------------------------------------------

        const tax =
            await this.taxRepository.findById(

                command.taxId,

                tx,

            );

        if (!tax) {

            throw new Error(

                "Tax assessment not found."

            );

        }


        //--------------------------------------------------
        // Domain Behavior
        //--------------------------------------------------

        tax.pay({

            paymentReference:
                command.paymentReference,

            paidAt:
                command.paidAt,

        });


        //--------------------------------------------------
        // Persist
        //--------------------------------------------------

        await this.taxRepository.save(

            tax,

            tx,

        );


        //--------------------------------------------------
        // Return
        //--------------------------------------------------

        return CommandResult.success({

            data:

                new TaxResponseDTO({

                    id:
                        tax.id,

                    transactionId:
                        tax.transactionId,

                    taxpayerId:
                        tax.taxpayerId,

                    taxType:
                        tax.taxType,

                    taxableAmount:
                        tax.taxableAmount,

                    taxAmount:
                        tax.taxAmount,

                    currency:
                        tax.currency,

                    status:
                        tax.status,

                }),

            events:

                tax.pullDomainEvents(),

        });

    }

}