
import { CommandUseCase } from "../../shared/application/use-case/CommandUseCase.js";
import { CommandResult } from "../../shared/application/dto/CommandResult.js";
import { TaxAssessment } from "../domain/entities/TaxAssessment.js";
import { TaxResponseDTO } from "../dto/TaxResponseDTO.js";

export class CalculateTaxUseCase extends CommandUseCase {
    constructor({
        taxRepository,
        taxPolicy,
        transactionManager,
        eventBus,
        logger,
    }) {
        super({ transactionManager, eventBus, logger });

        this.taxRepository = taxRepository;
        this.taxPolicy = taxPolicy;
    }

    async doExecute(command, tx) {
        const {
            transactionId,
            taxpayerId,
            taxType,
            taxableAmount,
            rate,
            currency,
        } = command;

        const { taxAmount } = this.taxPolicy.calculate({
            taxType,
            taxableAmount,
            rate,
        });

        const tax = new TaxAssessment({
            transactionId,
            taxpayerId,
            taxType,
            taxableAmount,
            taxAmount,
            currency,
        });

        tax.calculate();

        await this.taxRepository.save(tax, tx);

        return CommandResult.success({
            data: new TaxResponseDTO({
                id: tax.id,
                transactionId: tax.transactionId,
                taxpayerId: tax.taxpayerId,
                taxType: tax.taxType,
                taxableAmount: tax.taxableAmount,
                taxAmount: tax.taxAmount,
                currency: tax.currency,
                status: tax.status,
            }),
            events: tax.pullDomainEvents(),
        });
    }
}
