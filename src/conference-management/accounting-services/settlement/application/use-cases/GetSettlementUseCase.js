import { QueryUseCase }
    from "../../../shared/application/use-case/QueryUseCase.js";

import { SettlementResponseDTO }
    from "../dto/SettlementResponseDTO.js";


export class GetSettlementUseCase extends QueryUseCase {

    constructor({

        settlementRepository,

        logger,

    }) {

        super({

            logger,

        });

        this.settlementRepository =
            settlementRepository;

    }


    async doExecute(query) {

        const settlement =
            await this.settlementRepository.findById(

                query.settlementId,

            );

        if (!settlement) {

            throw new Error(

                "Settlement not found."

            );

        }


        return new SettlementResponseDTO({

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

        });

    }

}