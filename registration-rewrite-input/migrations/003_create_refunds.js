/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

  // Shared updated_at trigger function
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Refunds
  await knex.schema.createTable("refunds", (table) => {
    /*
     * Identity
     */
    table
      .uuid("id")
      .primary()
      .defaultTo(knex.raw("gen_random_uuid()"));

    /*
     * Parent payment
     */
    table
      .uuid("payment_id")
      .notNullable()
      .references("id")
      .inTable("payments")
      .onDelete("RESTRICT");

    /*
     * Refund amount
     * Stored in minor units (kobo, cents, etc.)
     */
    table
      .bigInteger("amount_minor")
      .notNullable();

    table
      .string("currency", 3)
      .notNullable();

    /*
     * Refund reason
     */
    table
      .string("reason_category", 50)
      .notNullable()
      .defaultTo("CUSTOMER_REQUEST");

    table.text("reason");

    /*
     * Approval / Operations
     */
    table.uuid("processed_by_user_id");

    /*
     * Refund lifecycle
     */
    table
      .text("status")
      .notNullable()
      .defaultTo("pending");

    /*
     * Gateway metadata
     */
    table.text("gateway_refund_id");

    table.string("gateway_provider", 32);

    table.text("error_message");

    /*
     * Idempotency
     */
    table
      .text("idempotency_key")
      .notNullable();

    /*
     * Arbitrary metadata
     */
    table
      .jsonb("metadata")
      .notNullable()
      .defaultTo(knex.raw(`'{}'::jsonb`));

    /*
     * Audit
     */
    table.timestamp("processed_at", { useTz: true });

    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
  });

  /*
   * Constraints
   */
  await knex.raw(`
    ALTER TABLE refunds
      ADD CONSTRAINT chk_refunds_amount_positive
        CHECK (amount_minor > 0),

      ADD CONSTRAINT chk_refunds_currency
        CHECK (currency ~ '^[A-Z]{3}$'),

      ADD CONSTRAINT chk_refunds_reason_category
        CHECK (
          reason_category IN (
            'DUPLICATE_CHARGE',
            'FRAUDULENT',
            'CUSTOMER_REQUEST',
            'SERVICE_DISRUPTION',
            'SYSTEM_ERROR',
            'OTHER'
          )
        ),

      ADD CONSTRAINT chk_refunds_status
        CHECK (
          status IN (
            'pending',
            'processing',
            'succeeded',
            'failed',
            'rejected'
          )
        );
  `);

  /*
   * Indexes
   */
  await knex.raw(`
    -- Prevent duplicate refund requests
    CREATE UNIQUE INDEX uq_refunds_payment_idempotency
      ON refunds (payment_id, idempotency_key);

    -- One gateway refund id per provider
    CREATE UNIQUE INDEX uq_refunds_gateway_refund_id
      ON refunds (gateway_refund_id)
      WHERE gateway_refund_id IS NOT NULL;

    -- FK lookup
    CREATE INDEX idx_refunds_payment_id
      ON refunds (payment_id);

    -- Operational queue
    CREATE INDEX idx_refunds_status_created
      ON refunds (status, created_at DESC);

    -- Gateway reconciliation
    CREATE INDEX idx_refunds_gateway_provider
      ON refunds (gateway_provider);

    -- Reporting
    CREATE INDEX idx_refunds_processed_at
      ON refunds (processed_at);
  `);

  /*
   * updated_at trigger
   */
  await knex.raw(`
    DROP TRIGGER IF EXISTS update_refunds_updated_at ON refunds;

    CREATE TRIGGER update_refunds_updated_at
    BEFORE UPDATE ON refunds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.raw(`
    DROP TRIGGER IF EXISTS update_refunds_updated_at
    ON refunds;
  `);

  await knex.schema.dropTableIfExists("refunds");
}