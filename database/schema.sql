-- ============================================================
-- SEtest Database Schema
-- Database: rnc
-- ============================================================

CREATE DATABASE IF NOT EXISTS rnc;
USE rnc;

-- ============================================================
-- USERS TABLE
-- Supports three roles: customer, admin, owner
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
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

-- ============================================================
-- PRODUCTS TABLE
-- ============================================================

CREATE TABLE products (
    product_id          INT AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(150) NOT NULL,
    material_used       VARCHAR(150),
    type_of_product     VARCHAR(100),
    price               DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    front_page_visible  BOOLEAN NOT NULL DEFAULT FALSE,
    image_path          VARCHAR(255),
    is_archived         BOOLEAN NOT NULL DEFAULT FALSE,
    created_by          INT,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_products_type ON products(type_of_product);
CREATE INDEX idx_products_visible ON products(front_page_visible);

-- ============================================================
-- INVENTORY TABLE
-- ============================================================

CREATE TABLE inventory (
    inventory_id        INT AUTO_INCREMENT PRIMARY KEY,
    item_name           VARCHAR(150) NOT NULL,
    category            ENUM('MUGS','SHIRTS','PAPER','SUPPLY','PEN','FANS','OTHER') NOT NULL DEFAULT 'OTHER',
    stock               INT NOT NULL DEFAULT 0,
    unit                VARCHAR(50) NOT NULL,
    low_stock_threshold  INT NOT NULL DEFAULT 10,
    high_stock_threshold INT NOT NULL DEFAULT 100,
    status              ENUM('Normal Stock','Low Stock','High Stock','Out of Stock') NOT NULL DEFAULT 'Normal Stock',
    remarks             TEXT,
    is_archived         BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at         DATETIME,
    created_by          INT,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_inventory_category ON inventory(category);
CREATE INDEX idx_inventory_status ON inventory(status);

-- ============================================================
-- INVENTORY UPDATE HISTORY TABLE
-- ============================================================

CREATE TABLE inventory_history (
    history_id      INT AUTO_INCREMENT PRIMARY KEY,
    inventory_id    INT NOT NULL,
    action          ENUM('ADD STOCK','DEDUCT STOCK') NOT NULL,
    quantity        INT NOT NULL,
    stock_before    INT NOT NULL,
    stock_after     INT NOT NULL,
    remarks         TEXT,
    updated_by      INT,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventory_id) REFERENCES inventory(inventory_id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ============================================================
-- ORDERS TABLE
-- ============================================================

CREATE TABLE orders (
    order_id            VARCHAR(20) PRIMARY KEY,           -- e.g. ORD-2026-00124
    customer_id         INT,
    product_id          INT,
    quantity            INT NOT NULL DEFAULT 1,
    unit_price          DECIMAL(10, 2) NOT NULL,
    discount_percent    DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    amount_deducted     DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    product_total       DECIMAL(10, 2) NOT NULL,
    delivery_fee        DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_amount        DECIMAL(10, 2) NOT NULL,
    customization_type  VARCHAR(150),
    design_description  TEXT,
    delivery_method     ENUM('Pickup','Delivery') NOT NULL DEFAULT 'Pickup',
    delivery_address    TEXT,
    delivery_date       DATETIME,
    payment_method      ENUM('GCash','Bank') DEFAULT NULL,
    payment_type        ENUM('Full Payment','50% Down Payment') DEFAULT NULL,
    amount_paid         DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    remaining_balance   DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    reference_number    VARCHAR(100),
    payment_status      ENUM('Unpaid','Partially Paid','Fully Paid') NOT NULL DEFAULT 'Unpaid',
    order_status        ENUM('Pending','Pending Verification','Verified','Processing','Out for Delivery','Delivered','Cancelled','Completed') NOT NULL DEFAULT 'Pending',
    is_rush             BOOLEAN NOT NULL DEFAULT FALSE,
    accepted_by         INT,
    receipt_no          VARCHAR(20),                        -- e.g. RC-2026-00124
    date_requested      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_accepted       DATETIME,
    date_finished       DATETIME,
    FOREIGN KEY (customer_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL,
    FOREIGN KEY (accepted_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_orders_status ON orders(order_status);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_date ON orders(date_requested);

-- ============================================================
-- USER TABLE  (admin/owner accounts — mirrors OwnerUser.html)
-- ============================================================
-- Note: This is a separate management table from `users`.
-- `users` = all accounts (customers + staff).
-- `user`  = staff-facing view used in the admin panel
--           (Username, Password, Role: admin | owner).
-- ============================================================

CREATE TABLE user (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(50) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    role        ENUM('admin','owner') NOT NULL DEFAULT 'admin',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_role ON user(role);

-- ============================================================
-- SAMPLE DATA (for development/testing)
-- ============================================================

-- Owner account (users)
INSERT INTO users (first_name, middle_name, last_name, email, username, password_hash, role)
VALUES ('Moiraine', 'Damodred', 'Sanche', 'moiraine_owner@example.com', '@MoiraineOwner', '$2b$12$placeholder_hash_owner', 'owner');

-- Admin account (users)
INSERT INTO users (first_name, middle_name, last_name, email, username, password_hash, role)
VALUES ('Moiraine', 'Damodred', 'Sanche', 'moiraine_admin@example.com', '@MoiraineAdmin', '$2b$12$placeholder_hash_admin', 'admin');

-- Customer account (users)
INSERT INTO users (first_name, middle_name, last_name, email, username, password_hash, role)
VALUES ('Jane', NULL, 'Doe', 'jane.doe@example.com', '@JaneDoe123', '$2b$12$placeholder_hash_customer', 'customer');

-- user table (admin panel accounts)
INSERT INTO user (username, password, role)
VALUES ('@MoiraineOwner', '$2b$12$placeholder_hash_owner', 'owner');

INSERT INTO user (username, password, role)
VALUES ('@MoiraineAdmin', '$2b$12$placeholder_hash_admin', 'admin');

-- Sample products
INSERT INTO products (name, material_used, type_of_product, price, front_page_visible, created_by)
VALUES ('Tumbler (360ml)', 'Sublimation', 'Mug & Tumbler', 45.00, TRUE, 1);

-- Sample inventory items
INSERT INTO inventory (item_name, category, stock, unit, low_stock_threshold, high_stock_threshold, status, created_by)
VALUES ('White Mug', 'MUGS', 50, 'Pcs', 10, 200, 'Normal Stock', 1);

INSERT INTO inventory (item_name, category, stock, unit, low_stock_threshold, high_stock_threshold, status, created_by)
VALUES ('White T-shirts', 'SHIRTS', 20, 'Pcs', 25, 100, 'Low Stock', 1);

INSERT INTO inventory (item_name, category, stock, unit, low_stock_threshold, high_stock_threshold, status, created_by)
VALUES ('A4 Glossy Paper (500s)', 'PAPER', 100, 'Reams', 10, 80, 'High Stock', 1);

INSERT INTO inventory (item_name, category, stock, unit, low_stock_threshold, high_stock_threshold, status, created_by)
VALUES ('Laminating Film (A4)', 'SUPPLY', 100, 'Pcs', 10, 80, 'High Stock', 1);

INSERT INTO inventory (item_name, category, stock, unit, low_stock_threshold, high_stock_threshold, status, created_by)
VALUES ('A4 Bond paper', 'PAPER', 100, 'Reams', 10, 80, 'High Stock', 1);

INSERT INTO inventory (item_name, category, stock, unit, low_stock_threshold, high_stock_threshold, status, is_archived, archived_at, created_by)
VALUES ('Click pen', 'PEN', 0, 'Pcs', 5, 50, 'Out of Stock', FALSE, NULL, 1);

INSERT INTO inventory (item_name, category, stock, unit, low_stock_threshold, high_stock_threshold, status, is_archived, archived_at, created_by)
VALUES ('White Mug (archived)', 'MUGS', 0, 'Pcs', 10, 200, 'Out of Stock', TRUE, '2026-05-26 00:00:00', 1);

-- Sample order
INSERT INTO orders (
    order_id, customer_id, product_id, quantity, unit_price,
    discount_percent, amount_deducted, product_total, delivery_fee, total_amount,
    customization_type, delivery_method, delivery_address, delivery_date,
    payment_method, payment_type, amount_paid, remaining_balance, reference_number,
    payment_status, order_status, is_rush, accepted_by, receipt_no,
    date_requested, date_accepted, date_finished
) VALUES (
    'ORD-2026-00124', 3, 1, 2, 45.00,
    10.00, 9.00, 81.00, 50.00, 131.00,
    'Uploaded Custom Design', 'Delivery',
    'Block 12 Lot 8, Phase 3, Barangay Banay-Banay, Cabuyao City, Laguna, 4025',
    '2026-03-26 12:00:00',
    'Bank', '50% Down Payment', 131.00, 0.00, '1234567890',
    'Fully Paid', 'Delivered', FALSE, 2, 'RC-2026-00124',
    '2026-05-25 15:37:00', '2026-05-25 17:30:00', '2026-05-26 14:00:00'
);
