-- Migration 006: Add size column to inventory for per-size shirt pricing
ALTER TABLE inventory
    ADD COLUMN size ENUM('XS','S','M','L','XL','2XL','3XL') NULL DEFAULT NULL
    AFTER category;
