/**
 * Create Account Use Case
 *
 * Application service responsible for opening
 * a ledger account and recording its domain event.
 */

import { randomUUID } from "node:crypto";

import AccountAggregate from "../../domain/aggregates/account/account.aggregate.js";

import { BaseDomainEvent } from "../../domain/events/base-domain.event.js";

export class CreateAccountUseCase {
    constructor({
        accountRepository,
        outboxRepository,
        uow,
        logger,
    }) {
        if (!accountRepository) {
            throw new Error("accountRepository is required.");
        }

        if (!uow || typeof uow.execute !== "function") {
            throw new Error("uow.execute() is required.");
        }

        this.accountRepository = accountRepository;
        this.outboxRepository = outboxRepository;
        this.uow = uow;
        this.logger = logger;
    }

    async execute(command) {
        if (
            !command ||
            typeof command !== "object" ||
            Array.isArray(command)
        ) {
            throw new Error("A valid account command is required.");
        }

        if (
            !command.tenantId ||
            typeof command.tenantId !== "string" ||
            !command.tenantId.trim()
        ) {
            throw new Error("tenantId is required.");
        }

        const account = new AccountAggregate({
            id: randomUUID(),
            tenantId: command.tenantId,
            accountNumber: command.code,
            name: command.name,
            currency: command.currency,
            type: command.type ?? "ASSET",
        });

        return this.uow.execute(async (trx) => {
            await this.accountRepository.save(
                account,
                { transaction: trx },
            );

            if (this.outboxRepository) {
                const event = new BaseDomainEvent({
                    eventName: "account.created",
                    aggregateId: account.id,
                    payload: {
                        account: account.toJSON(),
                        createdBy: command.createdBy ?? null,
                    },
                    metadata: {
                        aggregateType: "AccountAggregate",
                        correlationId: command.correlationId ?? null,
                    },
                });

                await this.outboxRepository.save(event, trx);
            }

            this.logger?.info(
                { accountId: account.id },
                "Ledger account created.",
            );

            return account;
        });
    }
}