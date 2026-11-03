/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

  /*
   * Create ledger account type enum.
   */
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'ledger_account_type'
      ) THEN
        CREATE TYPE ledger_account_type AS ENUM (
          'ASSET',
          'LIABILITY',
          'EQUITY',
          'REVENUE',
          'EXPENSE'
        );
      END IF;
    END
    $$;
  `);

  /*
   * Ledger Accounts
   *
   * Chart of Accounts.
   *
   * Accounts are immutable in type after creation.
   */
  await knex.schema.createTable("ledger_accounts", (table) => {
    /*
     * Identity
     */
    table
      .uuid("id")
      .primary()
      .defaultTo(knex.raw("gen_random_uuid()"));

    /*
     * Tenant boundary
     */
    table
      .uuid("tenant_id")
      .notNullable();

    /*
     * Account code
     *
     * Examples:
     * 1000_CASH
     * 4000_REVENUE
     */
    table
      .string("code", 64)
      .notNullable();

    table
      .string("name", 255)
      .notNullable();

    table
      .specificType("type", "ledger_account_type")
      .notNullable();

    /*
     * Currency
     */
    table
      .string("currency", 3)
      .notNullable();

    /*
     * Status
     */
    table
      .boolean("is_active")
      .notNullable()
      .defaultTo(true);

    /*
     * Audit
     */
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    /*
     * Constraints
     */

    // Account codes are unique within a tenant.
    table.unique(
      ["tenant_id", "code"],
      "uq_account_code"
    );

    /*
     * Indexes
     */

    table.index(
      ["tenant_id", "type"],
      "idx_account_type"
    );

    table.index(
      ["tenant_id", "currency"],
      "idx_account_currency"
    );

    table.index(
      ["tenant_id", "is_active"],
      "idx_account_active"
    );
  });

  /*
   * Required for composite foreign keys:
   *
   * FOREIGN KEY (tenant_id, account_id)
   * REFERENCES ledger_accounts (tenant_id, id)
   */
  await knex.raw(`
    ALTER TABLE ledger_accounts
    ADD CONSTRAINT uq_account_tenant
    UNIQUE (tenant_id, id);
  `);
}

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists("ledger_accounts");

  await knex.raw(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'ledger_account_type'
      ) THEN
        DROP TYPE ledger_account_type;
      END IF;
    END
    $$;
  `);
}