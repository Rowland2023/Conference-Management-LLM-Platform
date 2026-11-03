/**
 * @file src/cross-cutting/database/knex-unit-of-work.js
 * @description Knex.js concrete implementation of the UnitOfWork application contract.
 */

import { UnitOfWork } from "../../shared/application/persistence/UnitOfWork.js";

class KnexUnitOfWork extends UnitOfWork {
  /**
   * @param {Object} params
   * @param {import("knex").Knex} params.knex
   * @param {Object} [params.options]
   */
  constructor({ knex, options = {} }) {
    super();

    if (!knex) {
      throw new Error(
        "[KnexUnitOfWork] Knex instance is required."
      );
    }

    this.knex = knex;

    this.options = {
      timeout: 10000,
      ...options,
    };

    this.trackedAggregates = new Set();
  }

  /**
   * Track an aggregate for later domain-event collection.
   *
   * @param {Object} aggregate
   */
  track(aggregate) {
    if (aggregate) {
      this.trackedAggregates.add(aggregate);
    }
  }

  /**
   * Remove all tracked aggregates.
   */
  clear() {
    this.trackedAggregates.clear();
  }

  /**
   * Execute work inside a transaction.
   *
   * @param {(trx: import("knex").Knex.Transaction) => Promise<any>} work
   */
  async execute(work) {
    if (typeof work !== "function") {
      throw new Error(
        "[KnexUnitOfWork] Work parameter must be a function."
      );
    }

    try {
      return await this.knex.transaction(
        async (trx) => {
          return await work(trx);
        },
        this.options
      );
    } finally {
      this.clear();
    }
  }

  /**
   * Backward-compatible alias used by application use cases.
   *
   * @param {(trx: import("knex").Knex.Transaction) => Promise<any>} work
   */
  async runInTransaction(work) {
    return this.execute(work);
  }
}

export default KnexUnitOfWork;