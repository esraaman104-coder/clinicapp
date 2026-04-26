-- ============================================================
-- Migration 005: Invoice & Purchase Sequences
-- Purpose : Replace COUNT(*)-based serial generation with
--           PostgreSQL SEQUENCE objects to eliminate the race
--           condition that occurs when two transactions read
--           the same COUNT and produce duplicate numbers.
-- Author  : Antigravity (AI)
-- Date    : 2026-04-26
-- ============================================================

-- 1. Invoice sequence (used by sales module)
--    START WITH the current max to avoid clashing with existing rows.
DO $$
DECLARE
    v_max BIGINT;
BEGIN
    SELECT COALESCE(MAX(
        NULLIF(
            REGEXP_REPLACE(invoice_number, '^INV-\d{8}-', ''),
            ''
        )::BIGINT
    ), 0)
    INTO v_max
    FROM invoices;

    EXECUTE format(
        'CREATE SEQUENCE IF NOT EXISTS invoice_seq START WITH %s INCREMENT BY 1 NO CYCLE',
        v_max + 1
    );
END;
$$;

-- 2. Purchase sequence (used by purchases module)
--    Same approach: start after the highest existing sequence value.
DO $$
DECLARE
    v_max BIGINT;
BEGIN
    SELECT COALESCE(MAX(
        NULLIF(
            REGEXP_REPLACE(purchase_number, '^PUR-\d{8}-', ''),
            ''
        )::BIGINT
    ), 0)
    INTO v_max
    FROM purchases;

    EXECUTE format(
        'CREATE SEQUENCE IF NOT EXISTS purchase_seq START WITH %s INCREMENT BY 1 NO CYCLE',
        v_max + 1
    );
END;
$$;

-- ============================================================
-- Notes:
--   * nextval() is non-transactional by design in PostgreSQL.
--     Even if the outer transaction rolls back, the sequence
--     value is consumed — this means sequence numbers may have
--     gaps, which is acceptable and expected.
--   * Both sequences are global monotonic counters, not
--     per-day counters. The date portion in the invoice number
--     format (YYYYMMDD) comes from the application at insert
--     time, so numbers stay unique across days automatically.
--   * To reset sequences in development:
--       ALTER SEQUENCE invoice_seq  RESTART WITH 1;
--       ALTER SEQUENCE purchase_seq RESTART WITH 1;
-- ============================================================
