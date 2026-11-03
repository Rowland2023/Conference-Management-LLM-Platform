/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function up(knex) {
  /**
   * 3. Ledger Journals
   *
   * Immutable accounting transaction header.
   * Every journal owns two or more ledger entries.
   */
  await knex.schema.createTable("ledger_journals", (table) => {
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
     * Prevent duplicate posting
     */
    table
      .string("idempotency_key", 128)
      .notNullable();

    /*
     * Distributed tracing
     */
    table
      .string("correlation_id", 128)
      .notNullable();

    table
      .string("causation_id", 128);

    /*
     * Business reference
     */
    table
      .string("reference_type", 64)
      .notNullable();

    table
      .uuid("reference_id")
      .notNullable();

    /*
     * Description
     */
    table
      .string("description", 500)
      .notNullable();

    /*
     * Journal currency.
     * Every entry inside this journal
     * must use the same currency.
     */
    table
      .string("currency", 3)
      .notNullable();

    /*
     * Arbitrary metadata
     */
    table
      .jsonb("metadata")
      .notNullable()
      .defaultTo(knex.raw("'{}'::jsonb"));

    /*
     * Audit
     */
    table
      .timestamp("posted_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    /*
     * Reversal support
     */
    table
      .uuid("reversed_by_journal_id");

    table
      .foreign("reversed_by_journal_id")
      .references("id")
      .inTable("ledger_journals")
      .onDelete("RESTRICT");

    /*
     * Constraints
     */

    // Prevent duplicate journal postings.
    table.unique(
      ["tenant_id", "idempotency_key"],
      "uq_journal_idempotency"
    );

    /*
     * Indexes
     */

    table.index(
      ["tenant_id", "reference_type", "reference_id"],
      "idx_journal_reference"
    );

    table.index(
      ["tenant_id", "posted_at"],
      "idx_journal_posted"
    );

    table.index(
      ["tenant_id", "correlation_id"],
      "idx_journal_correlation"
    );
  });

  /*
   * Required for composite foreign keys:
   *
   * FOREIGN KEY (tenant_id, journal_id)
   * REFERENCES ledger_journals (tenant_id, id)
   */
  await knex.raw(`
    ALTER TABLE ledger_journals
    ADD CONSTRAINT uq_journal_tenant
    UNIQUE (tenant_id, id);
  `);
}

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function down(knex) {
  await knex.schema.dropTableIfExists("ledger_journals");
}