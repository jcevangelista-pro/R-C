CREATE TABLE IF NOT EXISTS password_reset_tokens (
    reset_id       BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id        INT NOT NULL,
    selector_hash  CHAR(64) NOT NULL UNIQUE,
    expires_at     DATETIME NOT NULL,
    used_at        DATETIME NULL,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_password_reset_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    INDEX idx_password_reset_user (user_id),
    INDEX idx_password_reset_expiry (expires_at)
);
