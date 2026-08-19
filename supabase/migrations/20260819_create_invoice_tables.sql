/*
  # Invoice persistence schema

  1. New Tables
    - `invoices` — permanent record of every generated/sent invoice
      - `id` (uuid, PK)
      - `numero` (text, unique) — consecutive number e.g. CC-2026-0001
      - `cliente_nombre` (text)
      - `cliente_nit` (text)
      - `cliente_email` (text)
      - `emisor_nombre` (text)
      - `emisor_documento` (text)
      - `emisor_telefono` (text)
      - `emisor_direccion` (text)
      - `banco` (text)
      - `cuenta_tipo` (text) — 'Ahorros' | 'Corriente'
      - `cuenta_numero` (text)
      - `cuenta_titular` (text)
      - `concepto` (text)
      - `valor` (numeric)
      - `fecha_emision` (date)
      - `fecha_vencimiento` (date)
      - `observaciones` (text)
      - `status` (text) — 'draft' | 'downloaded' | 'sent'
      - `telegram_user_id` (uuid, nullable) — linked telegram user
      - `pdf_url` (text, nullable) — Supabase Storage path
      - `created_at` (timestamptz)

    - `invoice_counters` — atomic consecutive numbering per year
      - `year` (smallint, PK)
      - `counter` (int) — current sequence number

    - `telegram_users` — links Telegram chat_id to invoice system
      - `id` (uuid, PK)
      - `telegram_chat_id` (bigint, unique)
      - `owner_nombre` (text)
      - `owner_documento` (text)
      - `linked_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Public INSERT for invoices (server-side only via service role)
    - telegram_users: public INSERT for linking, service-role SELECT
*/

-- ===== invoices =====
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text UNIQUE NOT NULL,
  cliente_nombre text NOT NULL,
  cliente_nit text NOT NULL,
  cliente_email text,
  emisor_nombre text NOT NULL,
  emisor_documento text NOT NULL,
  emisor_telefono text,
  emisor_direccion text,
  banco text,
  cuenta_tipo text CHECK (cuenta_tipo IN ('Ahorros', 'Corriente')),
  cuenta_numero text,
  cuenta_titular text,
  concepto text NOT NULL,
  valor numeric NOT NULL,
  fecha_emision date,
  fecha_vencimiento date,
  observaciones text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'downloaded', 'sent')),
  telegram_user_id uuid,
  pdf_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_numero ON invoices(numero);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_telegram_user ON invoices(telegram_user_id) WHERE telegram_user_id IS NOT NULL;

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Server can insert invoices" ON invoices
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Server can select invoices" ON invoices
  FOR SELECT TO service_role USING (true);

CREATE POLICY "Server can update invoices" ON invoices
  FOR UPDATE TO service_role USING (true);

-- ===== invoice_counters =====
CREATE TABLE IF NOT EXISTS invoice_counters (
  year smallint PRIMARY KEY,
  counter int NOT NULL DEFAULT 0
);

-- Seed current year if not exists
INSERT INTO invoice_counters (year, counter)
  VALUES (EXTRACT(YEAR FROM CURRENT_DATE)::smallint, 0)
  ON CONFLICT (year) DO NOTHING;

ALTER TABLE invoice_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Server can manage counters" ON invoice_counters
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ===== telegram_users =====
CREATE TABLE IF NOT EXISTS telegram_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_chat_id bigint UNIQUE NOT NULL,
  owner_nombre text NOT NULL,
  owner_documento text NOT NULL,
  linked_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_users_chat_id ON telegram_users(telegram_chat_id);

ALTER TABLE telegram_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Server can insert telegram links" ON telegram_users
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Server can select telegram users" ON telegram_users
  FOR SELECT TO service_role USING (true);

CREATE POLICY "Server can delete telegram links" ON telegram_users
  FOR DELETE TO service_role USING (true);
