import { QueryUseCase }
    from "../../../shared/application/use-case/QueryUseCase.js";

import { SettlementResponseDTO }
    from "../dto/SettlementResponseDTO.js";


export class ListSettlementsUseCase extends QueryUseCase {

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

        const settlements =
            await this.settlementRepository.findAll({

                merchantId:
                    query.merchantId,

                status:
                    query.status,

                page:
                    query.page,

                pageSize:
                    query.pageSize,

            });


        return settlements.map(

            settlement =>

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

                })

        );

    }

}