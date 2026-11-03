/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  // Create or replace the ledger validation function.
  // This function enforces the fundamental double-entry accounting invariants:
  //   1. Every journal must contain at least two entries.
  //   2. Total debits must equal total credits.
  await knex.raw(`
    CREATE OR REPLACE FUNCTION ledger_validate_journal()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    DECLARE
      v_journal_id UUID;
      v_entry_count INTEGER;
      v_balance BIGINT;
    BEGIN
      -- Determine which journal needs validation.
      -- NEW is available for INSERT/UPDATE, OLD for DELETE.
      v_journal_id := COALESCE(NEW.journal_id, OLD.journal_id);

      -- Calculate:
      --   • Number of entries
      --   • Debit minus Credit balance
      SELECT
        COUNT(*),
        COALESCE(
          SUM(
            CASE entry_type
              WHEN 'DEBIT' THEN amount_minor
              ELSE -amount_minor
            END
          ),
          0
        )
      INTO
        v_entry_count,
        v_balance
      FROM ledger_entries
      WHERE journal_id = v_journal_id;

      -- Allow complete journal deletion.
      IF v_entry_count = 0 THEN
        RETURN NULL;
      END IF;

      -- Every journal must contain at least two postings.
      IF v_entry_count < 2 THEN
        RAISE EXCEPTION
          'LEDGER_001: Journal % must contain at least two ledger entries.',
          v_journal_id;
      END IF;

      -- Total debits must equal total credits.
      IF v_balance <> 0 THEN
        RAISE EXCEPTION
          'LEDGER_002: Journal % is out of balance by % minor units.',
          v_journal_id,
          v_balance;
      END IF;

      RETURN NULL;
    END;
    $$;
  `);

  // Deferred constraint trigger allows an application to insert
  // all journal entries within a transaction before validation occurs.
  await knex.raw(`
    DROP TRIGGER IF EXISTS trg_ledger_validate_journal
    ON ledger_entries;

    CREATE CONSTRAINT TRIGGER trg_ledger_validate_journal
    AFTER INSERT OR UPDATE OR DELETE
    ON ledger_entries
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION ledger_validate_journal();
  `);
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  await knex.raw(`
    DROP TRIGGER IF EXISTS trg_ledger_validate_journal
    ON ledger_entries;
  `);

  await knex.raw(`
    DROP FUNCTION IF EXISTS ledger_validate_journal();
  `);
}