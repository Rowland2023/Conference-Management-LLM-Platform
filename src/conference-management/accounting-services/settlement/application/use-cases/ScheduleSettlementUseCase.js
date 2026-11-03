import { CommandUseCase }
    from "../../../shared/application/use-case/CommandUseCase.js";

import { CommandResult }
    from "../../../shared/application/dto/CommandResult.js";

import { SettlementResponseDTO }
    from "../dto/SettlementResponseDTO.js";


export class ScheduleSettlementUseCase extends CommandUseCase {

    constructor({

        settlementRepository,

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

    }


    async doExecute(command, tx) {

        //--------------------------------------------------
        // Load Aggregate
        //--------------------------------------------------

        const settlement =
            await this.settlementRepository.findById(

                command.settlementId,

                tx,

            );

        if (!settlement) {

            throw new Error(

                "Settlement not found."

            );

        }


        //--------------------------------------------------
        // Business Logic
        //--------------------------------------------------

        settlement.schedule(

            command.scheduledAt

        );


        //--------------------------------------------------
        // Persist
        //--------------------------------------------------

        await this.settlementRepository.save(

            settlement,

            tx,

        );


        //--------------------------------------------------
        // Logging
        //--------------------------------------------------

        this.log(

            "Settlement scheduled",

            {

                settlementId:
                    settlement.id,

            }

        );


        //--------------------------------------------------
        // Response
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