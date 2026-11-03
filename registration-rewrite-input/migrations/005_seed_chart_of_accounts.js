/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function up(knex) {
  // Ensure the ledger account type enum exists.
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

  // Default/system tenant.
  // Replace with your application's system tenant ID.
  const systemTenantId = "00000000-0000-0000-0000-000000000000";

  await knex("ledger_accounts")
    .insert([
      // ---------------------------------------------------------------------
      // Assets
      // ---------------------------------------------------------------------
      {
        tenant_id: systemTenantId,
        code: "1000_PAYSTACK_SETTLEMENT_NGN",
        name: "Paystack Settlement Account (NGN)",
        type: "ASSET",
        currency: "NGN",
        is_active: true,
      },
      {
        tenant_id: systemTenantId,
        code: "1001_FLUTTERWAVE_SETTLEMENT_NGN",
        name: "Flutterwave Settlement Account (NGN)",
        type: "ASSET",
        currency: "NGN",
        is_active: true,
      },
      {
        tenant_id: systemTenantId,
        code: "1002_STRIPE_SETTLEMENT_USD",
        name: "Stripe Settlement Account (USD)",
        type: "ASSET",
        currency: "USD",
        is_active: true,
      },
      {
        tenant_id: systemTenantId,
        code: "1010_BANK_SETTLEMENT_CLEARING",
        name: "Interbank Settlement Clearing Account",
        type: "ASSET",
        currency: "NGN",
        is_active: true,
      },

      // ---------------------------------------------------------------------
      // Liabilities
      // ---------------------------------------------------------------------
      {
        tenant_id: systemTenantId,
        code: "2000_CUSTOMER_WALLETS_NGN",
        name: "Customer Wallet Liabilities (NGN)",
        type: "LIABILITY",
        currency: "NGN",
        is_active: true,
      },
      {
        tenant_id: systemTenantId,
        code: "2001_CUSTOMER_WALLETS_USD",
        name: "Customer Wallet Liabilities (USD)",
        type: "LIABILITY",
        currency: "USD",
        is_active: true,
      },
      {
        tenant_id: systemTenantId,
        code: "2010_PENDING_REFUNDS_PAYABLE",
        name: "Pending Customer Refunds Payable",
        type: "LIABILITY",
        currency: "NGN",
        is_active: true,
      },
      {
        tenant_id: systemTenantId,
        code: "2020_UNALLOCATED_SUSPENSE",
        name: "Unallocated / Suspense Clearing Account",
        type: "LIABILITY",
        currency: "NGN",
        is_active: true,
      },

      // ---------------------------------------------------------------------
      // Equity
      // ---------------------------------------------------------------------
      {
        tenant_id: systemTenantId,
        code: "3000_RETAINED_EARNINGS",
        name: "Retained Earnings",
        type: "EQUITY",
        currency: "NGN",
        is_active: true,
      },

      // ---------------------------------------------------------------------
      // Revenue
      // ---------------------------------------------------------------------
      {
        tenant_id: systemTenantId,
        code: "4000_PROCESSING_FEE_REVENUE",
        name: "Transaction Processing Fee Revenue",
        type: "REVENUE",
        currency: "NGN",
        is_active: true,
      },
      {
        tenant_id: systemTenantId,
        code: "4001_INTERCHANGE_REVENUE",
        name: "Card Interchange Commission Revenue",
        type: "REVENUE",
        currency: "NGN",
        is_active: true,
      },

      // ---------------------------------------------------------------------
      // Expenses
      // ---------------------------------------------------------------------
      {
        tenant_id: systemTenantId,
        code: "5000_GATEWAY_PROCESSING_EXPENSE",
        name: "Payment Gateway Partner Charges",
        type: "EXPENSE",
        currency: "NGN",
        is_active: true,
      },
      {
        tenant_id: systemTenantId,
        code: "5001_INTERBANK_PAYOUT_EXPENSE",
        name: "NIBSS / Instant Transfer Payout Fees",
        type: "EXPENSE",
        currency: "NGN",
        is_active: true,
      },
    ])
    .onConflict(["tenant_id", "code"])
    .ignore();
}

/**
 * @param {import("knex").Knex} knex
 * @returns {Promise<void>}
 */
export async function down(knex) {
  const systemTenantId = "00000000-0000-0000-0000-000000000000";

  await knex("ledger_accounts")
    .where({ tenant_id: systemTenantId })
    .whereIn("code", [
      "1000_PAYSTACK_SETTLEMENT_NGN",
      "1001_FLUTTERWAVE_SETTLEMENT_NGN",
      "1002_STRIPE_SETTLEMENT_USD",
      "1010_BANK_SETTLEMENT_CLEARING",
      "2000_CUSTOMER_WALLETS_NGN",
      "2001_CUSTOMER_WALLETS_USD",
      "2010_PENDING_REFUNDS_PAYABLE",
      "2020_UNALLOCATED_SUSPENSE",
      "3000_RETAINED_EARNINGS",
      "4000_PROCESSING_FEE_REVENUE",
      "4001_INTERCHANGE_REVENUE",
      "5000_GATEWAY_PROCESSING_EXPENSE",
      "5001_INTERBANK_PAYOUT_EXPENSE",
    ])
    .del();
}