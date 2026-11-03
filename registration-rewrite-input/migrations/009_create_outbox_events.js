/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function up(knex) {
  // ---------------------------------------------------------------------------
  // Extensions
  // ---------------------------------------------------------------------------

  await knex.raw(`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
  `);

  // ---------------------------------------------------------------------------
  // Enum Types
  // ---------------------------------------------------------------------------

  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'outbox_event_status'
      ) THEN
        CREATE TYPE outbox_event_status AS ENUM (
          'PENDING',
          'PROCESSING',
          'PROCESSED',
          'FAILED',
          'DEAD_LETTER'
        );
      END IF;
    END
    $$;
  `);

  // ---------------------------------------------------------------------------
  // Outbox Events
  // ---------------------------------------------------------------------------

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS outbox_events (

      id UUID NOT NULL
        DEFAULT gen_random_uuid(),

      aggregate_type VARCHAR(100) NOT NULL,

      aggregate_id VARCHAR(255) NOT NULL,

      event_type VARCHAR(100) NOT NULL,

      payload JSONB NOT NULL,

      status outbox_event_status
        NOT NULL
        DEFAULT 'PENDING',

      retry_count INTEGER
        NOT NULL
        DEFAULT 0
        CHECK (retry_count >= 0),

      max_retries INTEGER
        NOT NULL
        DEFAULT 5
        CHECK (max_retries > 0),

      next_retry_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

      last_error TEXT,

      correlation_id UUID,

      created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW(),

      processed_at TIMESTAMPTZ,

      PRIMARY KEY (id, created_at)

    )
    PARTITION BY RANGE (created_at);
  `);

  // ---------------------------------------------------------------------------
  // Initial Monthly Partitions
  // ---------------------------------------------------------------------------

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS outbox_events_y2026m07
    PARTITION OF outbox_events
    FOR VALUES FROM ('2026-07-01 00:00:00+00')
              TO   ('2026-08-01 00:00:00+00');
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS outbox_events_y2026m08
    PARTITION OF outbox_events
    FOR VALUES FROM ('2026-08-01 00:00:00+00')
              TO   ('2026-09-01 00:00:00+00');
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS outbox_events_y2026m09
    PARTITION OF outbox_events
    FOR VALUES FROM ('2026-09-01 00:00:00+00')
              TO   ('2026-10-01 00:00:00+00');
  `);

  await knex.raw(`
    CREATE TABLE IF NOT EXISTS outbox_events_default
    PARTITION OF outbox_events DEFAULT;
  `);

  // ---------------------------------------------------------------------------
  // Indexes
  // ---------------------------------------------------------------------------

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_outbox_events_pending_polling
      ON outbox_events (
        next_retry_at,
        created_at
      )
      WHERE status = 'PENDING';
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_outbox_events_aggregate
      ON outbox_events (
        aggregate_type,
        aggregate_id
      );
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_outbox_events_correlation
      ON outbox_events (
        correlation_id
      )
      WHERE correlation_id IS NOT NULL;
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_outbox_events_status_created
      ON outbox_events (
        status,
        created_at
      );
  `);
}

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function down(knex) {
  // ---------------------------------------------------------------------------
  // Drop Partitioned Table
  // ---------------------------------------------------------------------------

  await knex.raw(`
    DROP TABLE IF EXISTS outbox_events CASCADE;
  `);

  // ---------------------------------------------------------------------------
  // Drop Enum
  // ---------------------------------------------------------------------------

  await knex.raw(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'outbox_event_status'
      ) THEN
        DROP TYPE outbox_event_status;
      END IF;
    END
    $$;
  `);
}