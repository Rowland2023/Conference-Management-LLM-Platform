/**
 * @file src/cross-cutting/database/KnexTransactionManager.js
 *
 * Knex implementation of the TransactionManager application port.
 */

const TransactionManager = require('../../shared/application/persistence/TransactionManager');

class KnexTransactionManager extends TransactionManager {
  /**
   * @param {Object} knex Knex instance
   */
  constructor(knex) {
    super();

    if (!knex) {
      throw new Error('KnexTransactionManager requires a Knex instance.');
    }

    this.knex = knex;
  }

  /**
   * Executes an operation inside a database transaction.
   *
   * @template T
   * @param {(trx: import('knex').Knex.Transaction) => Promise<T>} operation
   * @param {Object} [options]
   * @param {'read_committed'|'repeatable_read'|'serializable'} [options.isolationLevel]
   * @param {number} [options.timeoutMs]
   * @returns {Promise<T>}
   */
  async runInTransaction(operation, options = {}) {
    if (typeof operation !== 'function') {
      throw new TypeError(
        'Transaction operation must be a function.'
      );
    }

    return this.knex.transaction(async (trx) => {
      // Configure transaction before executing work
      await this.configureTransaction(trx, options);

      // Execute application work
      return operation(trx);
    });
  }

  /**
   * Applies optional transaction configuration.
   *
   * @private
   */
  async configureTransaction(trx, options) {
    const {
      isolationLevel,
      timeoutMs,
    } = options;

    if (isolationLevel) {
      await trx.raw(
        `SET TRANSACTION ISOLATION LEVEL ${this.mapIsolationLevel(isolationLevel)}`
      );
    }

    if (timeoutMs && Number.isFinite(timeoutMs)) {
      // PostgreSQL statement timeout (milliseconds)
      await trx.raw(
        'SET LOCAL statement_timeout = ?',
        [timeoutMs]
      );
    }
  }

  /**
   * Maps application isolation levels to PostgreSQL syntax.
   *
   * @private
   */
  mapIsolationLevel(level) {
    switch (level) {
      case 'read_committed':
        return 'READ COMMITTED';

      case 'repeatable_read':
        return 'REPEATABLE READ';

      case 'serializable':
        return 'SERIALIZABLE';

      default:
        throw new Error(
          `Unsupported isolation level: ${level}`
        );
    }
  }
}

module.exports = KnexTransactionManager;