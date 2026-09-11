ALTER TABLE users
    ADD COLUMN profile_image_path VARCHAR(255) NULL AFTER password_hash;
