
/**
 * Add tenant-scoped payment idempotency.
 *
 * Ensures that a tenant cannot create multiple payments
 * using the same idempotency key.
 *
 * Existing payments remain valid because the new column
 * is nullable.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
    await knex.schema.alterTable("payments", (table) => {
        table.string("idempotency_key", 255).nullable();
    });

    await knex.raw(`
        CREATE UNIQUE INDEX uq_payments_tenant_idempotency
        ON payments (tenant_id, idempotency_key)
        WHERE idempotency_key IS NOT NULL;
    `);
}

/**
 * Rollback payment idempotency migration.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
    await knex.raw(`
        DROP INDEX IF EXISTS uq_payments_tenant_idempotency;
    `);

    await knex.schema.alterTable("payments", (table) => {
        table.dropColumn("idempotency_key");
    });
}
