
/**
 * @file journal-entry.mapper.js
 *
 * Maps between PostgreSQL persistence rows and
 * JournalEntryAggregate domain objects.
 */

import JournalEntryAggregate from "../../domain/aggregates/journal-entry/journal-entry.aggregate.js";

export default class JournalEntryMapper {
  static #parseMetadata(metadata) {
    if (!metadata) {
      return {};
    }

    if (typeof metadata === "object") {
      return metadata;
    }

    try {
      return JSON.parse(metadata);
    } catch {
      return {};
    }
  }

  static #toBigInt(value) {
    if (value === null || value === undefined) {
      throw new TypeError(
        "Journal line amount is required."
      );
    }

    if (typeof value === "bigint") {
      return value;
    }

    return BigInt(value.toString());
  }

  static #mapLineToDomain(line) {
    return {
      id: line.id,
      accountId: line.account_id,
      amount: this.#toBigInt(line.amount),
      direction: line.direction,
      currency: line.currency,
    };
  }

  static toDomain(row, lineRows = []) {
    if (!row) {
      return null;
    }

    const entry = new JournalEntryAggregate({
      id: row.id,
      idempotencyKey: row.idempotency_key,
      description: row.description,
      currency: row.currency,
      status: row.status,
      postedAt: row.posted_at
        ? new Date(row.posted_at)
        : null,
      metadata: this.#parseMetadata(row.metadata),
    });

    for (const line of lineRows) {
      entry.addLine(this.#mapLineToDomain(line));
    }

    return entry;
  }

  static toPersistence(aggregate) {
    if (!aggregate) {
      return null;
    }

    const json =
      typeof aggregate.toJSON === "function"
        ? aggregate.toJSON()
        : aggregate;

    const entryRow = {
      id: json.id,
      tenant_id: json.tenantId,
      idempotency_key: json.idempotencyKey,
      correlation_id: json.correlationId,
      description: json.description,
      currency: json.currency,
      status: json.status,
      posted_at: json.postedAt
        ? new Date(json.postedAt)
        : new Date(),
      metadata: JSON.stringify(json.metadata ?? {}),
    };

    const lineRows = (json.lines ?? []).map((line) => ({
      id: line.id,
      journal_entry_id: json.id,
      account_id: line.accountId,
      amount: this.#toBigInt(
        line.amountInMinorUnits ?? line.amount
      ).toString(),
      direction: line.direction,
      currency: line.currency ?? json.currency,
    }));

    return {
      entryRow,
      lineRows,
    };
  }
}
