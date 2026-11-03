
import {
  ValidationError,
  ConflictError,
} from "../../../../../shared/application/errors/ApplicationErrors.js";

import {
  UnbalancedEntryError,
} from "../../domain/error/index.js";

import {
  JournalEntryPostedEvent,
} from "../../domain/events/journal-entry-posted.event.js";


export class PostJournalEntryUseCase {

  constructor({
    journalEntryRepository,
    accountRepository,
    unitOfWork,
    outboxRepository,
    logger,
    metrics,
  }) {

    this.journalEntryRepository =
      journalEntryRepository;

    this.accountRepository =
      accountRepository;

    this.unitOfWork =
      unitOfWork;

    this.outboxRepository =
      outboxRepository;

    this.logger =
      logger;

    this.metrics =
      metrics;
  }

  async execute({
    idempotencyKey,
    description,
    lines,
    metadata = {},
    requestedBy,
  }) {

    this.validateInput({
      idempotencyKey,
      lines,
    });

    const duplicate =
      await this.journalEntryRepository.findByIdempotencyKey(
        idempotencyKey
      );

    if (duplicate) {
      return {
        ...duplicate,
        isDuplicate: true,
      };
    }

    const normalizedLines =
      this.normalizeLines(lines);

    this.validateBalancedEntry(
      normalizedLines
    );

    try {

      return await this.unitOfWork.execute(
        async (session) => {

          const accountIds = [
            ...new Set(
              normalizedLines.map(
                (line) => line.accountId
              )
            ),
          ];

          const accounts =
            await this.accountRepository.findAndLockByIds(
              accountIds,
              { session }
            );

          this.validateAccounts(
            accounts,
            accountIds,
            normalizedLines
          );

          const journalEntry =
            await this.journalEntryRepository.create(
              {
                idempotencyKey,
                description,
                currency: normalizedLines[0].currency,
                status: "POSTED",
                postedAt: new Date(),
                metadata,
                lines: normalizedLines,
              },
              { session }
            );

          // The repository uses amountInMinorUnits.
          // JournalEntryPostedEvent expects amount.
          // Adapt the shape without changing normalizedLines.
          const eventLines =
            normalizedLines.map((line) => ({
              accountId: line.accountId,
              amount: line.amountInMinorUnits,
              direction: line.direction,
              currency: line.currency,
            }));

          const event =
            new JournalEntryPostedEvent({
              journalEntryId: journalEntry.id,
              idempotencyKey,
              description,
              lines: eventLines,
              metadata: {
                ...metadata,
                requestedBy,
              },
            });

          await this.outboxRepository.add(
            event,
            { session }
          );

          this.logger?.info({
            event: "JOURNAL_ENTRY_POSTED",
            journalEntryId: journalEntry.id,
            idempotencyKey,
            currency: journalEntry.currency,
          });

          this.metrics?.increment(
            "ledger.journal.posted",
            1,
            {
              currency: journalEntry.currency,
            }
          );

          return {
            ...journalEntry,
            isDuplicate: false,
          };
        }
      );

    } catch (error) {

      if (
        error.code === "23505" ||
        error.name === "UniqueConstraintError"
      ) {

        const duplicate =
          await this.journalEntryRepository.findByIdempotencyKey(
            idempotencyKey
          );

        if (duplicate) {
          return {
            ...duplicate,
            isDuplicate: true,
          };
        }

        throw new ConflictError(
          "Duplicate journal entry."
        );
      }

      throw error;
    }
  }

  //---------------------------------------------------------
  // Input Validation
  //---------------------------------------------------------

  validateInput({
    idempotencyKey,
    lines,
  }) {

    if (
      !idempotencyKey ||
      typeof idempotencyKey !== "string"
    ) {
      throw new ValidationError(
        "idempotencyKey is required."
      );
    }

    if (
      !Array.isArray(lines) ||
      lines.length < 2
    ) {
      throw new ValidationError(
        "Journal entry must contain at least two lines."
      );
    }
  }

  //---------------------------------------------------------
  // Line Normalization
  //---------------------------------------------------------

  normalizeLines(lines) {

    const currency =
      lines[0].currency
        ?.trim()
        ?.toUpperCase();

    if (!currency) {
      throw new ValidationError(
        "Currency is required."
      );
    }

    return lines.map(
      (line, index) => {

        if (!line.accountId) {
          throw new ValidationError(
            `Missing accountId on line ${index}.`
          );
        }

        let amount;

        try {

          amount = BigInt(
            line.amountInMinorUnits
          );

        } catch {

          throw new ValidationError(
            `Invalid amount on line ${index}.`
          );
        }

        if (amount <= 0n) {
          throw new ValidationError(
            `Amount must be positive on line ${index}.`
          );
        }

        if (
          line.currency
            ?.trim()
            ?.toUpperCase() !== currency
        ) {
          throw new ValidationError(
            "All journal lines must use the same currency."
          );
        }

        if (
          !["DEBIT", "CREDIT"].includes(
            line.direction
          )
        ) {
          throw new ValidationError(
            `Invalid direction on line ${index}.`
          );
        }

        return {
          accountId: line.accountId,
          amountInMinorUnits: amount.toString(),
          direction: line.direction,
          currency,
        };
      }
    );
  }

  //---------------------------------------------------------
  // Double-Entry Validation
  //---------------------------------------------------------

  validateBalancedEntry(lines) {

    let debit = 0n;
    let credit = 0n;

    for (const line of lines) {

      const amount = BigInt(
        line.amountInMinorUnits
      );

      if (line.direction === "DEBIT") {
        debit += amount;
      } else {
        credit += amount;
      }
    }

    if (debit !== credit) {
      throw new UnbalancedEntryError(
        `Debits (${debit}) must equal credits (${credit}).`
      );
    }
  }

  //---------------------------------------------------------
  // Account Validation
  //---------------------------------------------------------

  validateAccounts(
    accounts,
    expectedIds,
    lines
  ) {

    if (
      accounts.length !== expectedIds.length
    ) {
      throw new ValidationError(
        "One or more accounts do not exist."
      );
    }

    const accountMap = new Map(
      accounts.map(
        (account) => [
          account.id,
          account,
        ]
      )
    );

    for (const line of lines) {

      const account =
        accountMap.get(line.accountId);

      if (
        account.status &&
        account.status !== "ACTIVE"
      ) {
        throw new ValidationError(
          `Account ${account.id} is inactive.`
        );
      }

      if (
        account.currency &&
        account.currency !== line.currency
      ) {
        throw new ValidationError(
          `Account ${account.id} currency mismatch.`
        );
      }
    }
  }
}
