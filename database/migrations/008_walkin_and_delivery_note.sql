-- ============================================================
-- Migration 008: Add walk-in and delivery note support to orders
-- ============================================================

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_note VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS is_walkin TINYINT(1) NOT NULL DEFAULT 0;
