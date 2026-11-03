import { Settlement }
    from "../../domain/entities/Settlement.js";

import { SettlementResponseDTO }
    from "../dto/SettlementResponseDTO.js";

import { CommandResult }
    from "../../../shared/application/dto/CommandResult.js";

import { CommandUseCase }
    from "../../../shared/application/use-case/CommandUseCase.js";


export class CreateSettlementUseCase extends CommandUseCase {

    constructor({

        settlementRepository,

        settlementPolicy,

        transactionManager,

        eventBus,

        logger,

    }) {

        super({

            transactionManager,
            eventBus,
            logger,

        });

        this.settlementRepository =
            settlementRepository;

        this.settlementPolicy =
            settlementPolicy;

    }


    /**
     * Executes inside the transaction created
     * by CommandUseCase.
     */
    async doExecute(command, tx) {

        //--------------------------------------------------
        // Business Policy
        //--------------------------------------------------

        const allowed =
            this.settlementPolicy.canSettle({

                merchantId:
                    command.merchantId,

                amount:
                    command.amount,

            });

        if (!allowed) {

            throw new Error(

                "Settlement policy validation failed."

            );

        }


        //--------------------------------------------------
        // Create Aggregate
        //--------------------------------------------------

        const settlement =
            new Settlement({

                merchantId:
                    command.merchantId,

                amount:
                    command.amount,

                currency:
                    command.currency,

                method:
                    command.method,

            });


        settlement.create();


        //--------------------------------------------------
        // Persist Aggregate
        //--------------------------------------------------

        await this.settlementRepository.save(

            settlement,

            tx,

        );


        //--------------------------------------------------
        // Logging
        //--------------------------------------------------

        this.log(

            "Settlement created",

            {

                settlementId:
                    settlement.id,

                merchantId:
                    settlement.merchantId,

            }

        );


        //--------------------------------------------------
        // Return to CommandUseCase
        //--------------------------------------------------

        return CommandResult.success({

            data:

                new SettlementResponseDTO({

                    id:
                        settlement.id,

                    merchantId:
                        settlement.merchantId,

                    amount:
                        settlement.amount,

                    currency:
                        settlement.currency,

                    method:
                        settlement.method,

                    status:
                        settlement.status,

                    scheduledAt:
                        settlement.scheduledAt,

                }),

            events:

                settlement.pullDomainEvents(),

        });

    }

}