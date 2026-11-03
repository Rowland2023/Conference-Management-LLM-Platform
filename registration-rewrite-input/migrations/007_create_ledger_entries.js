/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

  /*
   * Create ledger entry type enum.
   */
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'ledger_entry_type'
      ) THEN
        CREATE TYPE ledger_entry_type AS ENUM (
          'DEBIT',
          'CREDIT'
        );
      END IF;
    END
    $$;
  `);

  /*
   * Ledger Entries
   *
   * Immutable debit/credit postings.
   * Every row represents exactly one side of an accounting transaction.
   */
  await knex.schema.createTable("ledger_entries", (table) => {
    /*
     * Identity
     */
    table
      .uuid("id")
      .primary()
      .defaultTo(knex.raw("gen_random_uuid()"));

    /*
     * Multi-tenant boundary
     */
    table
      .uuid("tenant_id")
      .notNullable();

    /*
     * Parent journal
     */
    table
      .uuid("journal_id")
      .notNullable();

    table
      .foreign("journal_id")
      .references("id")
      .inTable("ledger_journals")
      .onDelete("RESTRICT");

    /*
     * Ledger account
     */
    table
      .uuid("account_id")
      .notNullable();

    table
      .foreign("account_id")
      .references("id")
      .inTable("ledger_accounts")
      .onDelete("RESTRICT");

    /*
     * Debit / Credit
     */
    table
      .specificType("entry_type", "ledger_entry_type")
      .notNullable();

    /*
     * Always positive.
     * Direction comes from entry_type.
     */
    table
      .bigInteger("amount_minor")
      .notNullable();

    /*
     * Currency
     */
    table
      .string("currency", 3)
      .notNullable();

    /*
     * Position inside journal.
     */
    table
      .smallint("line_number")
      .notNullable();

    /*
     * Optional business metadata.
     */
    table
      .jsonb("metadata")
      .notNullable()
      .defaultTo(knex.raw("'{}'::jsonb"));

    /*
     * Audit timestamp.
     */
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    /*
     * Constraints
     */

    // Monetary amounts must always be positive.
    table.check("amount_minor > 0");

    // Each line number must be unique within a journal.
    table.unique(
      ["journal_id", "line_number"],
      "uq_entry_line_number"
    );

    /*
     * Indexes
     */

    table.index(
      ["tenant_id", "journal_id"],
      "idx_entries_journal"
    );

    table.index(
      ["tenant_id", "account_id"],
      "idx_entries_account"
    );

    table.index(
      ["tenant_id", "account_id", "created_at"],
      "idx_entries_account_created"
    );

    table.index(
      ["tenant_id", "currency"],
      "idx_entries_currency"
    );
  });
}

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists("ledger_entries");

  await knex.raw(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'ledger_entry_type'
      ) THEN
        DROP TYPE ledger_entry_type;
      END IF;
    END
    $$;
  `);
}