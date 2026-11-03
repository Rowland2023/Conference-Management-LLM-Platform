/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function up(knex) {
  /*
   * Additional domain constraints.
   */

  await knex.raw(`
    ALTER TABLE ledger_entries
    ADD CONSTRAINT chk_ledger_entries_currency_format
      CHECK (currency ~ '^[A-Z]{3}$');
  `);

  /*
   * Additional lookup indexes.
   */

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_ledger_entries_account_created
      ON ledger_entries (account_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_ledger_entries_journal_lookup
      ON ledger_entries (journal_id);
  `);
}

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function down(knex) {
  await knex.raw(`
    DROP INDEX IF EXISTS idx_ledger_entries_journal_lookup;
  `);

  await knex.raw(`
    DROP INDEX IF EXISTS idx_ledger_entries_account_created;
  `);

  await knex.raw(`
    ALTER TABLE ledger_entries
      DROP CONSTRAINT IF EXISTS chk_ledger_entries_currency_format;
  `);
}