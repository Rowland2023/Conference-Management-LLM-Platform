
/**
 * @file src/conference-management/accounting-services/ledger/domain/value-objects/money.vo.js
 *
 * Immutable Value Object representing monetary amounts in minor units.
 */

import { InvalidArgumentError } from "../error/index.js";

export default class Money {
  constructor(amount, currency) {
    if (typeof currency !== "string" || !currency.trim()) {
      throw new InvalidArgumentError(
        "Money: valid ISO currency required."
      );
    }

    const normalizedCurrency = currency.trim().toUpperCase();

    if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
      throw new InvalidArgumentError(
        `Invalid currency '${currency}'.`
      );
    }

    this._amount = Money.parseMinorUnitsStrict(amount);
    this._currency = normalizedCurrency;

    Object.freeze(this);
  }

  get amount() {
    return this._amount;
  }

  get currency() {
    return this._currency;
  }

  /**
   * Parses an integer amount expressed in minor units.
   *
   * @param {bigint|string|number} value
   * @returns {bigint}
   */
  static parseMinorUnitsStrict(value) {
    if (typeof value === "bigint") {
      return value;
    }

    if (typeof value === "number") {
      if (!Number.isSafeInteger(value)) {
        throw new InvalidArgumentError(
          "Amount must be a safe integer in minor units."
        );
      }

      return BigInt(value);
    }

    if (typeof value !== "string" || !value.trim()) {
      throw new InvalidArgumentError(
        "Amount must be expressed in integer minor units."
      );
    }

    const normalized = value.trim();

    if (!/^[+-]?\d+$/.test(normalized)) {
      throw new InvalidArgumentError(
        "Amount must be expressed in integer minor units."
      );
    }

    try {
      return BigInt(normalized);
    } catch {
      throw new InvalidArgumentError(
        "Amount must be expressed in integer minor units."
      );
    }
  }

  /**
   * Validates that an amount is strictly positive.
   *
   * @param {bigint|string|number} value
   * @returns {bigint}
   */
  static assertPositive(value) {
    const amount = Money.parseMinorUnitsStrict(value);

    if (amount <= 0n) {
      throw new InvalidArgumentError(
        "Amount must be greater than zero."
      );
    }

    return amount;
  }
}
