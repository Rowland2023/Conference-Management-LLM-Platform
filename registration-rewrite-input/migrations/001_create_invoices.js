/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // 1. Ensure UUID extension is active (PostgreSQL)
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

  // 2. Create Enums with idempotent safety
  await knex.raw(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
        CREATE TYPE invoice_status AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'line_item_category') THEN
        CREATE TYPE line_item_category AS ENUM ('MANAGEMENT_FEE', 'VENDOR_PASS_THROUGH', 'TECHNOLOGY', 'ON_SITE_STAFF', 'INCIDENTAL');
      END IF;
    END $$;
  `);

  // 3. Create Conference Invoices Table
  await knex.schema.createTable('conference_invoices', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('invoice_number', 64).notNullable().unique();
    table.string('conference_name', 255).notNullable();
    table.string('client_name', 255).notNullable();
    table.string('client_email', 255).notNullable();
    table.text('client_address').notNullable();

    table.date('issue_date').notNullable();
    table.date('due_date').notNullable();
    table.date('event_start_date').notNullable();
    table.date('event_end_date').notNullable();

    table.specificType('status', 'invoice_status').notNullable().defaultTo('DRAFT');
    table.decimal('tax_rate', 5, 2).notNullable().defaultTo(7.50);
    table.decimal('deposit_paid', 12, 2).notNullable().defaultTo(0.00);

    // Stored financial subtotals
    table.decimal('subtotal', 12, 2).notNullable().defaultTo(0.00);
    table.decimal('tax_amount', 12, 2).notNullable().defaultTo(0.00);
    table.decimal('total_amount_due', 12, 2).notNullable().defaultTo(0.00);

    table.timestamps(true, true);

    // Query Optimization Indexes
    table.index(['status'], 'idx_invoices_status');
    table.index(['client_email'], 'idx_invoices_client_email');
    table.index(['issue_date', 'due_date'], 'idx_invoices_dates');
  });

  // 4. Create Line Items Table
  await knex.schema.createTable('invoice_line_items', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('invoice_id')
      .notNullable()
      .references('id')
      .inTable('conference_invoices')
      .onDelete('CASCADE')
      .index('idx_line_items_invoice_id'); // Index foreign key explicitly

    table.specificType('category', 'line_item_category').notNullable();
    table.string('description', 500).notNullable();
    table.decimal('quantity', 10, 2).notNullable().defaultTo(1.00);
    table.decimal('unit_price', 12, 2).notNullable();
    table.decimal('total_price', 12, 2).notNullable();

    table.timestamps(true, true);
  });

  // 5. Enforce Financial Invariants & Date Constraints at DB level
  await knex.raw(`
    ALTER TABLE conference_invoices
      ADD CONSTRAINT chk_invoices_dates CHECK (due_date >= issue_date),
      ADD CONSTRAINT chk_event_dates CHECK (event_end_date >= event_start_date),
      ADD CONSTRAINT chk_tax_rate CHECK (tax_rate >= 0.00 AND tax_rate <= 100.00),
      ADD CONSTRAINT chk_amounts_non_negative CHECK (
        subtotal >= 0.00 AND tax_amount >= 0.00 AND total_amount_due >= 0.00 AND deposit_paid >= 0.00
      );

    ALTER TABLE invoice_line_items
      ADD CONSTRAINT chk_line_item_quantity CHECK (quantity > 0.00),
      ADD CONSTRAINT chk_line_item_unit_price CHECK (unit_price >= 0.00),
      ADD CONSTRAINT chk_line_item_total_price CHECK (total_price >= 0.00);
  `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  // Drop tables in strict reverse-dependency order
  await knex.schema.dropTableIfExists('invoice_line_items');
  await knex.schema.dropTableIfExists('conference_invoices');

  // Safely drop custom PostgreSQL types
  await knex.raw('DROP TYPE IF EXISTS line_item_category CASCADE;');
  await knex.raw('DROP TYPE IF EXISTS invoice_status CASCADE;');
}