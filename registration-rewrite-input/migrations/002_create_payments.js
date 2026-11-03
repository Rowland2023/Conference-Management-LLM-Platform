/**
 * Payment persistence schema
 *
 * Domain source of truth:
 * Payment.js
 * PaymentStatus.js
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

  await knex.schema.createTable("payments", (table) => {
    // ---------------------------------------------------------
    // Identity
    // ---------------------------------------------------------

    table
      .uuid("id")
      .primary()
      .defaultTo(knex.raw("gen_random_uuid()"));

    // ---------------------------------------------------------
    // Multi-tenancy / business context
    // ---------------------------------------------------------

    table.uuid("tenant_id").notNullable();

    table.uuid("context_id").notNullable();

    table.string("context_type", 50).notNullable();

    // ---------------------------------------------------------
    // Customer
    // ---------------------------------------------------------

    table.uuid("user_id").nullable();

    table.string("email", 320).notNullable();

    table.uuid("seller_id").nullable();

    // ---------------------------------------------------------
    // Money
    //
    // Amount is stored in minor units:
    // NGN -> Kobo
    // USD -> Cents
    // ---------------------------------------------------------

    table.bigInteger("amount").notNullable();

    table.string("currency", 3).notNullable();

    // ---------------------------------------------------------
    // Payment lifecycle
    // ---------------------------------------------------------

    table
      .string("status", 30)
      .notNullable()
      .defaultTo("PENDING");

    table.string("gateway", 30).notNullable();

    // ---------------------------------------------------------
    // Gateway information
    // ---------------------------------------------------------

    table.string("external_reference", 255).nullable();

    table.string("checkout_url", 2048).nullable();

    table.string("gateway_transaction_id", 255).nullable();

    table.jsonb("gateway_failure").nullable();

    // ---------------------------------------------------------
    // Lifecycle timestamps
    // ---------------------------------------------------------

    table.timestamp("paid_at", {
      useTz: true,
    }).nullable();

    table.timestamp("released_at", {
      useTz: true,
    }).nullable();

    table.timestamp("created_at", {
      useTz: true,
    }).notNullable().defaultTo(knex.fn.now());

    table.timestamp("updated_at", {
      useTz: true,
    }).notNullable().defaultTo(knex.fn.now());

    // ---------------------------------------------------------
    // Aggregate version
    //
    // Used for optimistic concurrency / aggregate versioning.
    // ---------------------------------------------------------

    table
      .integer("version")
      .notNullable()
      .defaultTo(0);
  });

  // ===========================================================
  // Database constraints
  // ===========================================================

  await knex.raw(`
    ALTER TABLE payments
      ADD CONSTRAINT chk_payments_amount
        CHECK (amount > 0),

      ADD CONSTRAINT chk_payments_currency
        CHECK (currency IN ('NGN', 'USD', 'GHS', 'KES')),

      ADD CONSTRAINT chk_payments_status
        CHECK (
          status IN (
            'PENDING',
            'GATEWAY_INITIALIZED',
            'SUCCESSFUL',
            'HELD',
            'RELEASED',
            'FAILED',
            'PARTIALLY_REFUNDED',
            'REFUNDED',
            'CANCELED'
          )
        );
  `);

  // ===========================================================
  // Idempotency
  // ===========================================================

  /*
   * Payment idempotency is currently handled by the application
   * layer through the payment aggregate/request contract.
   *
   * If idempotency_key is part of the payment command/database
   * contract, add it explicitly rather than silently reusing
   * an old schema field.
   */

  // ===========================================================
  // Gateway reconciliation indexes
  // ===========================================================

  await knex.raw(`
    CREATE UNIQUE INDEX uq_payments_gateway_transaction_id
      ON payments (gateway_transaction_id)
      WHERE gateway_transaction_id IS NOT NULL;
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX uq_payments_external_reference
      ON payments (external_reference)
      WHERE external_reference IS NOT NULL;
  `);

  // ===========================================================
  // Query indexes
  // ===========================================================

  await knex.raw(`
    CREATE INDEX idx_payments_tenant_id
      ON payments (tenant_id);
  `);

  await knex.raw(`
    CREATE INDEX idx_payments_context
      ON payments (context_type, context_id);
  `);

  await knex.raw(`
    CREATE INDEX idx_payments_user_id
      ON payments (user_id);
  `);

  await knex.raw(`
    CREATE INDEX idx_payments_status
      ON payments (status);
  `);

  await knex.raw(`
    CREATE INDEX idx_payments_created_at
      ON payments (created_at DESC);
  `);

  // ===========================================================
  // Updated-at trigger
  // ===========================================================

  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await knex.raw(`
    CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
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
    DROP TRIGGER IF EXISTS update_payments_updated_at
    ON payments;
  `);

  await knex.schema.dropTableIfExists("payments");
}