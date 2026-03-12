import { execSql } from '@/core/db/exec-sql';

export async function applyPaymentsMigration(schemaName: string): Promise<void> {
  await execSql(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".payments (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_number   TEXT NOT NULL UNIQUE,
        transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase','sale')),
        transaction_id   UUID NOT NULL,
        contact_id       UUID REFERENCES "${schemaName}".contacts(id),
        amount           NUMERIC NOT NULL CHECK (amount > 0),
        payment_date     TIMESTAMPTZ NOT NULL DEFAULT now(),
        payment_method   TEXT NOT NULL DEFAULT 'cash'
                         CHECK (payment_method IN ('cash','bank_transfer','cheque','upi','other')),
        reference_number TEXT,
        notes            TEXT,
        recorded_by      UUID NOT NULL,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        deleted_at       TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_payments_txn
        ON "${schemaName}".payments(transaction_type, transaction_id)
        WHERE deleted_at IS NULL;

      ALTER TABLE "${schemaName}".payments ENABLE ROW LEVEL SECURITY;

      DO $$ BEGIN
        CREATE POLICY "service_role_only" ON "${schemaName}".payments
          AS RESTRICTIVE FOR ALL TO PUBLIC USING (false);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
}
