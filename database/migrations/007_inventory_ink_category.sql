-- Migration 007: Add INK category to inventory for ink bottles.
ALTER TABLE inventory
    MODIFY category ENUM('MUGS','SHIRTS','PAPER','SUPPLY','PEN','FANS','INK','OTHER') NOT NULL DEFAULT 'OTHER';
