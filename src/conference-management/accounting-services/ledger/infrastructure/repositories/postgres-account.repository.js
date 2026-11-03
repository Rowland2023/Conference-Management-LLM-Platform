/**
 * @file postgres-account.repository.js
 *
 * PostgreSQL implementation of AccountRepository.
 *
 * Responsibilities:
 * - Persist account aggregates
 * - Tenant isolation
 * - Row-level locking
 * - Deterministic lock ordering
 */

import db
  from "../../../../../cross-cutting/database/knex.js";

import AccountMapper
  from "../mappers/account.mapper.js";

export class PostgresAccountRepository {

  async save(
    accountAggregate,
    options = {}
  ) {

    const client =
      this.#getClient(options);

    const row =
      AccountMapper.toPersistence(
        accountAggregate
      );

    if (!row.tenant_id) {
      throw new Error(
        "tenant_id is required."
      );
    }

    await client("accounts")
      .insert(row)
      .onConflict([
        "id",
        "tenant_id",
      ])
      .merge({

        name:
          row.name,

        available_balance:
          row.available_balance,

        pending_balance:
          row.pending_balance,

        status:
          row.status,

        metadata:
          row.metadata,

        updated_at:
          row.updated_at,

      });

  }

  async findById(
    tenantId,
    accountId,
    options = {}
  ) {

    this.#requireTenant(
      tenantId
    );

    const client =
      this.#getClient(options);

    const row =
      await client("accounts")
        .where({

          tenant_id:
            tenantId,

          id:
            accountId,

        })
        .first();

    return AccountMapper.toDomain(
      row
    );

  }

  async findByIdForUpdate(
    tenantId,
    accountId,
    options = {}
  ) {

    this.#requireTenant(
      tenantId
    );

    const client =
      this.#getTransaction(options);

    const row =
      await client("accounts")
        .where({

          tenant_id:
            tenantId,

          id:
            accountId,

        })
        .forUpdate()
        .first();

    return AccountMapper.toDomain(
      row
    );

  }

  async findManyByIdsForUpdate(
    tenantId,
    accountIds = [],
    options = {}
  ) {

    this.#requireTenant(
      tenantId
    );

    if (
      accountIds.length === 0
    ) {
      return [];
    }

    const client =
      this.#getTransaction(options);

    const sortedIds =
      [...new Set(accountIds)]
        .sort();

    const rows =
      await client("accounts")
        .where(
          "tenant_id",
          tenantId
        )
        .whereIn(
          "id",
          sortedIds
        )
        .orderBy(
          "id",
          "asc"
        )
        .forUpdate();

    return rows.map(
      AccountMapper.toDomain
    );

  }

  #getClient(
    options
  ) {

    return (
      options.transaction ??
      options.session ??
      db
    );

  }

  #getTransaction(
    options
  ) {

    const transaction =
      options.transaction ??
      options.session;

    if (!transaction) {
      throw new Error(
        "Transaction is required for row locking."
      );
    }

    return transaction;

  }

  #requireTenant(
    tenantId
  ) {

    if (!tenantId) {
      throw new Error(
        "tenantId is required."
      );
    }

  }

}