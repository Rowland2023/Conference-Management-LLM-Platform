
/**
 * @file ledger/domain/aggregates/account/account.aggregate.js
 */

import { randomUUID } from "node:crypto";

import { AggregateRoot }
  from "../../../../../../Shared/domain/AggregateRoot.js";

import {
  InvalidArgumentError,
  InsufficientFundsError,
} from "../../error/index.js";

import AccountStatus
  from "./account-status.vo.js";

import HoldEntity
  from "./hold.entity.js";

import {
  AccountHeldEvent,
  AccountReleasedEvent,
} from "../../events/index.js";

export default class AccountAggregate extends AggregateRoot {

  constructor({
    id,
    tenantId,
    accountNumber,
    name,
    currency,
    type = "ASSET",
    status = AccountStatus.ACTIVE,
    postedBalance = 0n,
    holds = [],
    createdAt = new Date(),
  }) {

    // Validate before AggregateRoot / Entity receives the ID.
    if (
      !id ||
      typeof id !== "string" ||
      id.trim() === ""
    ) {
      throw new InvalidArgumentError(
        "Account id is required."
      );
    }

    super(id);

    this._tenantId = tenantId;

    this._accountNumber = accountNumber;

    this._name = name ?? "";

    this._currency =
      currency?.toUpperCase();

    this._type =
      type.toUpperCase();

    this._status =
      status instanceof AccountStatus
        ? status
        : new AccountStatus(status);

    this._postedBalance =
      AccountAggregate.parseMinorUnitsStrict(
        postedBalance
      );

    this._holds = new Map();

    this._pendingBalance = 0n;

    this._createdAt =
      new Date(createdAt);

    for (const hold of holds) {

      const entity =
        hold instanceof HoldEntity
          ? hold
          : new HoldEntity(hold);

      this._holds.set(
        entity.idempotencyKey,
        entity
      );

      if (entity.isActive()) {
        this._pendingBalance += entity.amount;
      }
    }

    this.assertInvariant();
  }

  //---------------------------------------------------------
  // Getters
  //---------------------------------------------------------

  get id() {
    return this._id;
  }

  get status() {
    return this._status;
  }

  get postedBalance() {
    return this._postedBalance;
  }

  get pendingBalance() {
    return this._pendingBalance;
  }

  get availableBalance() {
    return (
      this._postedBalance -
      this._pendingBalance
    );
  }

  get holds() {
    return [
      ...this._holds.values(),
    ];
  }

  //---------------------------------------------------------
  // Domain Behaviour
  //---------------------------------------------------------

  createHold({
    id = randomUUID(),
    idempotencyKey,
    amount,
    description,
    expiresAt,
  }) {

    this._status.assertCanPlaceHold();

    // Idempotent requests return the original hold.
    if (
      this._holds.has(idempotencyKey)
    ) {
      return {
        hold: this._holds.get(idempotencyKey),
        isDuplicate: true,
      };
    }

    const holdAmount =
      AccountAggregate.parseMinorUnitsStrict(
        amount
      );

    if (holdAmount <= 0n) {
      throw new InvalidArgumentError(
        "Hold amount must be positive."
      );
    }

    if (
      this.availableBalance <
      holdAmount
    ) {
      throw new InsufficientFundsError(
        `Available balance ${this.availableBalance} is less than requested ${holdAmount}.`
      );
    }

    const hold =
      new HoldEntity({
        id,
        accountId: this._id,
        idempotencyKey,
        amount: holdAmount,
        currency: this._currency,
        description,
        expiresAt,
      });

    // Construct the event before mutating aggregate state.
    const event =
      new AccountHeldEvent({
        accountId: this._id,
        holdId: hold.id,
        idempotencyKey: hold.idempotencyKey,
        amount: hold.amount,
        currency: this._currency,
        expiresAt: hold.expiresAt,
      });

    this._holds.set(
      idempotencyKey,
      hold
    );

    this._pendingBalance += holdAmount;

    this.assertInvariant();

    this.addDomainEvent(event);

    return {
      hold,
      isDuplicate: false,
    };
  }

  releaseHold(idempotencyKey) {

    if (
      this._status.equals(
        AccountStatus.CLOSED
      )
    ) {
      throw new InvalidArgumentError(
        "Cannot release holds from a closed account."
      );
    }

    const hold =
      this._holds.get(idempotencyKey);

    if (!hold) {
      throw new InvalidArgumentError(
        `Hold '${idempotencyKey}' not found.`
      );
    }

    // Construct the event before changing the hold.
    const event =
      new AccountReleasedEvent({
        accountId: this._id,
        holdId: hold.id,
        releasedAmount: hold.amount,
      });

    // May throw if the hold is expired or inactive.
    // Balance must remain unchanged if it throws.
    hold.release();

    this._pendingBalance -= hold.amount;

    this.assertInvariant();

    this.addDomainEvent(event);
  }

  //---------------------------------------------------------
  // Invariants
  //---------------------------------------------------------

  assertInvariant() {

    if (
      this._pendingBalance < 0n
    ) {
      throw new InvalidArgumentError(
        "Pending balance cannot be negative."
      );
    }

    if (
      this._postedBalance < 0n
    ) {
      throw new InvalidArgumentError(
        "Posted balance cannot be negative."
      );
    }

    if (
      this._pendingBalance >
      this._postedBalance
    ) {
      throw new InvalidArgumentError(
        "Pending balance cannot exceed posted balance."
      );
    }
  }

  //---------------------------------------------------------
  // Serialization
  //---------------------------------------------------------

  toJSON() {

    return {
      id: this._id,

      tenantId: this._tenantId,

      accountNumber: this._accountNumber,

      name: this._name,

      currency: this._currency,

      type: this._type,

      status: this._status.value,

      postedBalance: this._postedBalance,

      pendingBalance: this._pendingBalance,

      availableBalance: this.availableBalance,

      holds: this.holds.map(
        (hold) => hold.toJSON()
      ),

      createdAt: this._createdAt,
    };
  }

  //---------------------------------------------------------
  // Utilities
  //---------------------------------------------------------

  static parseMinorUnitsStrict(value) {

    if (
      typeof value === "bigint"
    ) {
      return value;
    }

    if (
      value === null ||
      value === undefined
    ) {
      return 0n;
    }

    const normalized =
      String(value).trim();

    if (
      normalized.includes(".")
    ) {
      throw new InvalidArgumentError(
        "Amount must be expressed in integer minor units."
      );
    }

    return BigInt(normalized);
  }
}
