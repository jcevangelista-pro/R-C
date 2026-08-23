USE rnc;

ALTER TABLE inventory MODIFY stock DECIMAL(12,2) NOT NULL DEFAULT 0.00;
ALTER TABLE inventory MODIFY reorder_level DECIMAL(12,2) NOT NULL DEFAULT 10.00;
ALTER TABLE inventory_history MODIFY stock_before DECIMAL(12,2) NOT NULL;
ALTER TABLE inventory_history MODIFY stock_after DECIMAL(12,2) NOT NULL;
ALTER TABLE cart ADD CONSTRAINT uq_cart_customer_product UNIQUE (customer_id, product_id);

ALTER TABLE orders
    ADD COLUMN customization_file_path VARCHAR(255) NULL AFTER design_description,
    ADD COLUMN quotation_status ENUM('Draft','Sent','Accepted','Rejected','Revised') NOT NULL DEFAULT 'Draft' AFTER quotation_notes,
    ADD COLUMN quotation_created_by INT NULL AFTER quotation_status,
    ADD COLUMN quotation_sent_at DATETIME NULL AFTER quotation_created_by,
    ADD COLUMN quotation_responded_at DATETIME NULL AFTER quotation_sent_at,
    ADD COLUMN inventory_deducted_at DATETIME NULL AFTER date_finished,
    ADD CONSTRAINT fk_orders_quotation_user FOREIGN KEY (quotation_created_by) REFERENCES users(user_id) ON DELETE SET NULL;

CREATE TABLE payments (
    payment_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(20) NOT NULL,
    submitted_by INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('GCash','Bank') NOT NULL,
    payment_type ENUM('Full Payment','50% Down Payment','Final Payment') NOT NULL,
    reference_number VARCHAR(100),
    proof_path VARCHAR(255),
    status ENUM('Submitted','Verified','Rejected') NOT NULL DEFAULT 'Submitted',
    verified_by INT NULL,
    verified_at DATETIME NULL,
    rejection_reason VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE RESTRICT,
    FOREIGN KEY (submitted_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (verified_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_payments_order_status (order_id, status)
);

CREATE TABLE audit_logs (
    audit_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    order_id VARCHAR(20) NULL,
    event_type VARCHAR(80) NOT NULL,
    details_json JSON NULL,
    ip_address VARCHAR(45) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE SET NULL,
    INDEX idx_audit_order_date (order_id, created_at)
);

