import { QueryUseCase }
    from "../../shared/application/use-case/QueryUseCase.js";

import { TaxResponseDTO }
    from "../dto/TaxResponseDTO.js";


export class ListTaxesUseCase extends QueryUseCase {

    constructor({

        taxRepository,

        logger,

    }) {

        super({

            logger,

        });

        this.taxRepository =
            taxRepository;

    }


    async doExecute(query) {

        //--------------------------------------------------
        // Retrieve Taxes
        //--------------------------------------------------

        const taxes =
            await this.taxRepository.findAll({

                taxpayerId:
                    query.taxpayerId,

                transactionId:
                    query.transactionId,

                taxType:
                    query.taxType,

                status:
                    query.status,

                page:
                    query.page,

                pageSize:
                    query.pageSize,

            });


        //--------------------------------------------------
        // Response
        //--------------------------------------------------

        return taxes.map(

            (tax) =>

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

                })

        );

    }

}