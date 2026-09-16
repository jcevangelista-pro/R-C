-- DEVELOPMENT USE ONLY.
-- Re-running this file restores the shared development credentials.
-- Do not apply this seed to a public production database.

INSERT INTO users (first_name, middle_name, last_name, email, username, password_hash, role, is_active)
VALUES ('R&C', NULL, 'Owner', 'owner@rcprinting.local', '@RNCOwner',
        '$2y$10$eOifeCXCjAd8kRxkJ3QhIu0FNju7v.S3mv/HSfiRCtEY.y6XT1CrK', 'owner', 1)
ON DUPLICATE KEY UPDATE
    first_name=VALUES(first_name), last_name=VALUES(last_name),
    password_hash=VALUES(password_hash), role='owner', is_active=1;

INSERT INTO users (first_name, middle_name, last_name, email, username, password_hash, role, is_active)
VALUES ('R&C', NULL, 'Admin', 'admin@rcprinting.local', '@RNCAdmin',
        '$2y$10$aGVGs7gBMZ6PkkHkVATTwOodd5ASvsLJW6LtLBWBna/BECllyokj2', 'admin', 1)
ON DUPLICATE KEY UPDATE
    first_name=VALUES(first_name), last_name=VALUES(last_name),
    password_hash=VALUES(password_hash), role='admin', is_active=1;

