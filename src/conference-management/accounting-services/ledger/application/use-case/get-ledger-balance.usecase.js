/**
 * @file get-ledger-balance.usecase.js
 *
 * Retrieves an account's ledger balance as of a specific date.
 */

import {
  ValidationError,
  NotFoundError,
} from "../../../../../shared/application/errors/ApplicationErrors.js";

const toBigIntSafe = (value) => {
  if (typeof value === "bigint") {
    return value;
  }

  if (value === null || value === undefined || value === "") {
    return 0n;
  }

  const normalized = String(value).trim().split(".")[0];

  if (!normalized || Number.isNaN(Number(normalized))) {
    return 0n;
  }

  return BigInt(normalized);
};

export class GetLedgerBalanceUseCase {
  constructor({
    accountRepository,
    journalEntryRepository,
    logger,
    metrics,
  }) {
    this.accountRepository = accountRepository;
    this.journalEntryRepository = journalEntryRepository;
    this.logger = logger;
    this.metrics = metrics;
  }

  async execute({
    accountId,
    currency,
    asOfDate,
    requestedBy,
  }) {
    this.validateInput(accountId, asOfDate);

    const effectiveDate = asOfDate
      ? new Date(asOfDate)
      : new Date();

    const account = await this.loadAccount(accountId);

    const targetCurrency = this.resolveCurrency(
      account,
      currency
    );

    const balances =
      await this.journalEntryRepository.calculateAccountBalance({
        accountId: account.id,
        currency: targetCurrency,
        asOfDate: effectiveDate,
      });

    const postedBalance = toBigIntSafe(
      balances.postedBalance
    );

    const pendingBalance = toBigIntSafe(
      balances.pendingBalance
    );

    const availableBalance =
      postedBalance - pendingBalance;

    this.recordMetrics({
      account,
      currency: targetCurrency,
      asOfDate: effectiveDate,
      requestedBy,
    });

    return {
      accountId: account.id,
      accountName: account.name,
      currency: targetCurrency,
      balance: postedBalance.toString(),
      pendingBalance: pendingBalance.toString(),
      availableBalance:
        availableBalance.toString(),
      asOf: effectiveDate.toISOString(),
    };
  }

  validateInput(accountId, asOfDate) {
    if (
      !accountId ||
      typeof accountId !== "string"
    ) {
      throw new ValidationError(
        "accountId must be a valid string."
      );
    }

    if (asOfDate) {
      const date = new Date(asOfDate);

      if (Number.isNaN(date.getTime())) {
        throw new ValidationError(
          "asOfDate must be a valid ISO-8601 date."
        );
      }

      if (date > new Date()) {
        throw new ValidationError(
          "asOfDate cannot be in the future."
        );
      }
    }
  }

  async loadAccount(accountId) {
    const account =
      await this.accountRepository.findById(
        accountId
      );

    if (!account) {
      throw new NotFoundError(
        `Account '${accountId}' not found.`
      );
    }

    if (
      account.status &&
      account.status !== "ACTIVE"
    ) {
      throw new ValidationError(
        `Account '${accountId}' is ${account.status}.`
      );
    }

    return account;
  }

  resolveCurrency(account, requestedCurrency) {
    const currency = (
      requestedCurrency ??
      account.currency
    )?.toUpperCase();

    if (
      account.currency &&
      currency !== account.currency.toUpperCase()
    ) {
      throw new ValidationError(
        `Currency mismatch. Account currency is ${account.currency}.`
      );
    }

    return currency;
  }

  recordMetrics({
    account,
    currency,
    asOfDate,
    requestedBy,
  }) {
    const actor =
      typeof requestedBy === "object"
        ? requestedBy?.id ??
          requestedBy?.userId
        : requestedBy;

    this.logger?.info({
      event: "LEDGER_BALANCE_CHECKED",
      accountId: account.id,
      currency,
      asOf: asOfDate.toISOString(),
      requestedBy: actor ?? "SYSTEM",
    });

    this.metrics?.increment(
      "ledger.balance.checked",
      1,
      { currency }
    );
  }
}