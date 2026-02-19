BEGIN;

CREATE TABLE IF NOT EXISTS mpesa_settings (
  id SERIAL PRIMARY KEY,
  property_id INTEGER UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  consumer_key TEXT,
  consumer_secret TEXT,
  passkey TEXT,
  shortcode TEXT,
  party_b TEXT,
  callback_base_url TEXT,
  account_reference_prefix TEXT NOT NULL DEFAULT 'RENT',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_mpesa_settings_environment'
  ) THEN
    ALTER TABLE mpesa_settings
      ADD CONSTRAINT chk_mpesa_settings_environment
      CHECK (environment IN ('sandbox', 'live'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS payment_provider_transactions (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'initiated',
  merchant_request_id TEXT,
  checkout_request_id TEXT,
  mpesa_receipt_number TEXT,
  phone TEXT,
  amount NUMERIC(12,2),
  result_code TEXT,
  result_desc TEXT,
  raw_callback JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_payment_provider_transactions_payment_id'
  ) THEN
    EXECUTE 'CREATE INDEX idx_payment_provider_transactions_payment_id ON payment_provider_transactions(payment_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'uq_payment_provider_transactions_mpesa_checkout'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX uq_payment_provider_transactions_mpesa_checkout ON payment_provider_transactions(provider, checkout_request_id) WHERE checkout_request_id IS NOT NULL';
  END IF;
END $$;

COMMIT;

-- ROLLBACK SCRIPT
BEGIN;
DROP INDEX IF EXISTS uq_payment_provider_transactions_mpesa_checkout;
DROP INDEX IF EXISTS idx_payment_provider_transactions_payment_id;
DROP TABLE IF EXISTS payment_provider_transactions;
ALTER TABLE mpesa_settings DROP CONSTRAINT IF EXISTS chk_mpesa_settings_environment;
DROP TABLE IF EXISTS mpesa_settings;
COMMIT;

