import { QueryUseCase }
    from "../../shared/application/use-case/QueryUseCase.js";

import { TaxResponseDTO }
    from "../dto/TaxResponseDTO.js";


export class GetTaxUseCase extends QueryUseCase {

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
        // Retrieve Aggregate
        //--------------------------------------------------

        const tax =
            await this.taxRepository.findById(

                query.taxId,

            );

        if (!tax) {

            throw new Error(

                "Tax assessment not found."

            );

        }


        //--------------------------------------------------
        // Response
        //--------------------------------------------------

        return new TaxResponseDTO({

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

        });

    }

}