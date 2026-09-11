-- ============================================================
-- R&C PRINTING SERVICES — Database Schema
-- Covers: FR-01 through FR-43
-- Database: rnc
-- ============================================================

CREATE DATABASE IF NOT EXISTS rnc;
USE rnc;

-- ============================================================
-- 1. USERS (FR-01)
-- Roles: Admin, Owner, Customer
-- ============================================================

CREATE TABLE users (
    user_id         INT AUTO_INCREMENT PRIMARY KEY,
    first_name      VARCHAR(100) NOT NULL,
    middle_name     VARCHAR(100),
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    username        VARCHAR(50) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            ENUM('customer', 'admin', 'owner') NOT NULL DEFAULT 'customer',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login      DATETIME NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

CREATE TABLE password_reset_tokens (
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

-- ============================================================
-- 2. CUSTOMERS (FR-02)
-- Extended info for customer accounts
-- ============================================================

CREATE TABLE customers (
    customer_id     INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL UNIQUE,
    phone_num       VARCHAR(30) NOT NULL,
    address         TEXT NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_customers_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ============================================================
-- 3. PRODUCTS (FR-03, FR-07)
-- ============================================================

CREATE TABLE products (
    product_id          INT AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(150) NOT NULL,
    description         TEXT NULL,
    material_used       VARCHAR(150),
    type_of_product     VARCHAR(100),
    price               DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    image_path          VARCHAR(255),
    front_page_visible  BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived         BOOLEAN NOT NULL DEFAULT FALSE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_by          INT,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_products_type ON products(type_of_product);
CREATE INDEX idx_products_visible ON products(front_page_visible);
CREATE INDEX idx_products_active ON products(is_active);

-- ============================================================
-- 4. INVENTORY (FR-04, FR-05)
-- is_active used for archiving (FR-05)
-- ============================================================

CREATE TABLE inventory (
    inventory_id         INT AUTO_INCREMENT PRIMARY KEY,
    item_name            VARCHAR(150) NOT NULL,
    description          TEXT NULL,
    category             ENUM('MUGS','SHIRTS','PAPER','SUPPLY','PEN','FANS','OTHER') NOT NULL DEFAULT 'OTHER',
    unit_of_measure      VARCHAR(50) NOT NULL,
    stock                DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    reorder_level        DECIMAL(12,2) NOT NULL DEFAULT 10.00,
    unit_cost            DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
    remarks              TEXT,
    created_by           INT,
    created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_inventory_category ON inventory(category);
CREATE INDEX idx_inventory_active ON inventory(is_active);

-- ============================================================
-- 5. PRODUCT MATERIALS — BOM (FR-06)
-- Defines materials + quantities needed per product
-- ============================================================

CREATE TABLE product_materials (
    product_material_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id          INT NOT NULL,
    inventory_id        INT NOT NULL,
    quantity_required   DECIMAL(12,2) NOT NULL,

    CONSTRAINT fk_pm_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_pm_inventory
        FOREIGN KEY (inventory_id) REFERENCES inventory(inventory_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT uq_product_material
        UNIQUE (product_id, inventory_id)
);

-- ============================================================
-- 6. ORDERS (FR-08, FR-10, FR-11, FR-12, FR-13, FR-14, FR-28, FR-29, FR-30, FR-32)
-- ============================================================

CREATE TABLE orders (
    order_id            VARCHAR(20) PRIMARY KEY,
    customer_id         INT NOT NULL,
    accepted_by         INT NULL,

    -- Rush (FR-12)
    is_rush             BOOLEAN NOT NULL DEFAULT FALSE,
    rush_fee            DECIMAL(10, 2) NOT NULL DEFAULT 0.00,

    -- Customization (FR-13)
    customization_type  VARCHAR(150),
    design_description  TEXT,
    customization_file_path VARCHAR(255) NULL,

    -- Discount (FR-14)
    discount_percent    DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    amount_deducted     DECIMAL(10, 2) NOT NULL DEFAULT 0.00,

    -- Totals (FR-30)
    product_total       DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    delivery_fee        DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_amount        DECIMAL(10, 2) NOT NULL DEFAULT 0.00,

    -- Quotation (FR-32)
    quotation_amount    DECIMAL(10, 2) NULL,
    quotation_notes     TEXT NULL,
    quotation_status    ENUM('Draft','Sent','Accepted','Rejected','Revised') NOT NULL DEFAULT 'Draft',
    quotation_created_by INT NULL,
    quotation_sent_at   DATETIME NULL,
    quotation_responded_at DATETIME NULL,

    -- Delivery
    delivery_method     ENUM('Pickup','Delivery') NOT NULL DEFAULT 'Pickup',
    delivery_address    TEXT,
    delivery_date       DATETIME,

    -- Payment (FR-29)
    payment_method      ENUM('GCash','Bank') DEFAULT NULL,
    payment_type        ENUM('Full Payment','50% Down Payment') DEFAULT NULL,
    amount_paid         DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    remaining_balance   DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    reference_number    VARCHAR(100),
    payment_screenshot  VARCHAR(255) NULL,
    payment_status      ENUM('Unpaid','Partial','Paid') NOT NULL DEFAULT 'Unpaid',

    -- Order Status (FR-28)
    order_status        ENUM('Pending','In Progress','Completed','Cancelled') NOT NULL DEFAULT 'Pending',

    -- Receipt
    receipt_no          VARCHAR(20),

    -- Timestamps (FR-11)
    date_requested      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_accepted       DATETIME,
    date_finished       DATETIME,
    inventory_deducted_at DATETIME NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_orders_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_orders_accepted_by
        FOREIGN KEY (accepted_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE SET NULL,

    CONSTRAINT fk_orders_quotation_user
        FOREIGN KEY (quotation_created_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX idx_orders_status ON orders(order_status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_date ON orders(date_requested);

-- ============================================================
-- 7. ORDER DETAILS (FR-15, FR-30)
-- Line items per order (multi-product support)
-- ============================================================

CREATE TABLE order_details (
    order_detail_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id        VARCHAR(20) NOT NULL,
    product_id      INT NOT NULL,
    quantity        INT NOT NULL,
    unit_price      DECIMAL(10,2) NOT NULL,
    sub_total       DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,

    CONSTRAINT fk_od_order
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_od_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT chk_order_quantity
        CHECK (quantity > 0)
);

CREATE INDEX idx_od_order ON order_details(order_id);

-- ============================================================
-- 8. PROCESS STEPS (FR-17)
-- The 8 predefined order workflow steps
-- ============================================================

CREATE TABLE process_steps (
    process_step_id INT AUTO_INCREMENT PRIMARY KEY,
    step_number     INT NOT NULL UNIQUE,
    step_name       VARCHAR(100) NOT NULL,
    description     TEXT NULL,

    CONSTRAINT chk_step_number
        CHECK (step_number BETWEEN 1 AND 8)
);

-- ============================================================
-- 9. ORDER PROCESS (FR-16, FR-18, FR-19)
-- Tracks each order through the 8 steps with evidence
-- ============================================================

CREATE TABLE order_process (
    process_id      INT AUTO_INCREMENT PRIMARY KEY,
    order_id        VARCHAR(20) NOT NULL,
    process_step_id INT NOT NULL,

    status          ENUM('Pending','In Progress','Completed','Skipped')
                        NOT NULL DEFAULT 'Pending',

    process_date    DATE NULL,
    completed_at    DATETIME NULL,
    completed_by    INT NULL,

    -- Evidence (FR-18, FR-19)
    image           VARCHAR(255) NULL,
    notes           TEXT NULL,

    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_op_order
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_op_step
        FOREIGN KEY (process_step_id) REFERENCES process_steps(process_step_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_op_completed_by
        FOREIGN KEY (completed_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE SET NULL,

    CONSTRAINT uq_order_process_step
        UNIQUE (order_id, process_step_id)
);

-- ============================================================
-- 10. NOTIFICATIONS (FR-20, FR-21, FR-22, FR-41)
-- Messages tied to order process steps
-- ============================================================

CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    process_id      INT NULL,
    user_id         INT NOT NULL,
    sent_by         INT NOT NULL,
    title           VARCHAR(200) NOT NULL,
    message         TEXT NOT NULL,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notif_process
        FOREIGN KEY (process_id) REFERENCES order_process(process_id)
        ON UPDATE CASCADE ON DELETE SET NULL,

    CONSTRAINT fk_notif_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_notif_sent_by
        FOREIGN KEY (sent_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX idx_notif_user ON notifications(user_id);
CREATE INDEX idx_notif_read ON notifications(is_read);

-- ============================================================
-- 11. INVENTORY HISTORY (FR-23, FR-24, FR-25, FR-26, FR-27)
-- Full audit trail for all stock movements
-- ============================================================

CREATE TABLE inventory_history (
    history_id      INT AUTO_INCREMENT PRIMARY KEY,
    inventory_id    INT NOT NULL,
    order_id        VARCHAR(20) NULL,
    action          ENUM('Added','Deducted','Adjusted') NOT NULL,
    quantity        DECIMAL(12,2) NOT NULL,
    stock_before    DECIMAL(12,2) NOT NULL,
    stock_after     DECIMAL(12,2) NOT NULL,
    reason          VARCHAR(255) NULL,
    notes           TEXT NULL,
    updated_by      INT,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_ih_inventory
        FOREIGN KEY (inventory_id) REFERENCES inventory(inventory_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_ih_order
        FOREIGN KEY (order_id) REFERENCES orders(order_id)
        ON UPDATE CASCADE ON DELETE SET NULL,

    CONSTRAINT fk_ih_user
        FOREIGN KEY (updated_by) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX idx_ih_inventory ON inventory_history(inventory_id);
CREATE INDEX idx_ih_order ON inventory_history(order_id);
CREATE INDEX idx_ih_date ON inventory_history(created_at);

-- Verified payment ledger: submitted payments never affect paid totals until approved.
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
    rejection_reason VARCHAR(255),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE RESTRICT,
    FOREIGN KEY (submitted_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (verified_by) REFERENCES users(user_id) ON DELETE SET NULL,
    INDEX idx_payments_order_status (order_id,status)
);

CREATE TABLE audit_logs (
    audit_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    order_id VARCHAR(20) NULL,
    event_type VARCHAR(80) NOT NULL,
    details_json JSON NULL,
    ip_address VARCHAR(45),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE SET NULL,
    INDEX idx_audit_order_date (order_id,created_at)
);

-- ============================================================
-- 12. CART (FR-09)
-- Temporary cart items before order submission
-- ============================================================

CREATE TABLE cart (
    cart_id         INT AUTO_INCREMENT PRIMARY KEY,
    customer_id     INT NOT NULL,
    product_id      INT NOT NULL,
    quantity        INT NOT NULL DEFAULT 1,
    added_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_cart_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_cart_product
        FOREIGN KEY (product_id) REFERENCES products(product_id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT chk_cart_qty CHECK (quantity > 0)
);

CREATE INDEX idx_cart_customer ON cart(customer_id);
CREATE UNIQUE INDEX uq_cart_customer_product ON cart(customer_id, product_id);

-- ============================================================
-- SEED: Process Steps (FR-17)
-- ============================================================

INSERT INTO process_steps (step_number, step_name, description) VALUES
    (1, 'Order Details', 'Order is submitted by the customer after checkout'),
    (2, 'Verification', 'Owner communicates with the customer to verify the order'),
    (3, 'Initial Payment', 'Initial payment is processed and verified'),
    (4, 'Processing', 'Order is being prepared and customized'),
    (5, 'Final Payment', 'Remaining order balance is processed'),
    (6, 'Out for Delivery', 'Completed order is handed over for delivery'),
    (7, 'Order Received Confirmation', 'Customer confirms the order has been received'),
    (8, 'Order Completed', 'Order is officially marked as completed');

-- ============================================================
-- SEED: Sample accounts
-- ============================================================

INSERT INTO users (first_name, middle_name, last_name, email, username, password_hash, role)
VALUES ('Moiraine', 'Damodred', 'Sanche', 'moiraine_owner@example.com', '@MoiraineOwner', '$2b$12$placeholder_hash_owner', 'owner');

INSERT INTO users (first_name, middle_name, last_name, email, username, password_hash, role)
VALUES ('Moiraine', 'Damodred', 'Sanche', 'moiraine_admin@example.com', '@MoiraineAdmin', '$2b$12$placeholder_hash_admin', 'admin');

INSERT INTO users (first_name, middle_name, last_name, email, username, password_hash, role)
VALUES ('Jane', NULL, 'Doe', 'jane.doe@example.com', '@JaneDoe123', '$2b$12$placeholder_hash_customer', 'customer');

INSERT INTO customers (user_id, phone_num, address)
VALUES (3, '09XX-XXX-XXXX', 'Block 12 Lot 8, Phase 3, Barangay Banay-Banay, Cabuyao City, Laguna, 4025');

INSERT INTO products (name, material_used, type_of_product, price, front_page_visible, created_by)
VALUES ('Tumbler (360ml)', 'Sublimation', 'Mug & Tumbler', 45.00, TRUE, 1);

INSERT INTO inventory (item_name, category, stock, unit_of_measure, reorder_level, unit_cost, created_by)
VALUES ('White Mug', 'MUGS', 50, 'Pcs', 10, 25.00, 1);
