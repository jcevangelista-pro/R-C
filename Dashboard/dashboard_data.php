<?php
// ============================================================
// Dashboard Data API
// Returns JSON with all stats needed by Dashboard.html
// ============================================================

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../database/connection.php';

try {

    // ── ORDER STATS ──────────────────────────────────────────
    $totalOrders     = (int) $pdo->query("SELECT COUNT(*) FROM orders")->fetchColumn();
    $pendingOrders   = (int) $pdo->query("SELECT COUNT(*) FROM orders WHERE order_status = 'Pending'")->fetchColumn();
    $processingOrders= (int) $pdo->query("SELECT COUNT(*) FROM orders WHERE order_status = 'In Progress'")->fetchColumn();
    $completedOrders = (int) $pdo->query("SELECT COUNT(*) FROM orders WHERE order_status = 'Completed'")->fetchColumn();
    $cancelledOrders = (int) $pdo->query("SELECT COUNT(*) FROM orders WHERE order_status = 'Cancelled'")->fetchColumn();

    // Orders due today
    $ordersDueToday  = (int) $pdo->query(
        "SELECT COUNT(*) FROM orders WHERE DATE(delivery_date) = CURDATE()"
    )->fetchColumn();

    // ── MONTHLY ORDER QUANTITY (last 12 months) ──────────────
    $monthlyOrders = $pdo->query("
        SELECT
            DATE_FORMAT(date_requested, '%b') AS month_label,
            DATE_FORMAT(date_requested, '%Y-%m') AS month_key,
            COUNT(*) AS qty
        FROM orders
        WHERE date_requested >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)
        GROUP BY month_key, month_label
        ORDER BY month_key ASC
    ")->fetchAll();

    // ── MONTHLY SALES REVENUE (last 12 months) ───────────────
    $monthlySales = $pdo->query("
        SELECT
            DATE_FORMAT(date_requested, '%b') AS month_label,
            DATE_FORMAT(date_requested, '%Y-%m') AS month_key,
            COALESCE(SUM(total_amount), 0) AS revenue
        FROM orders
        WHERE order_status NOT IN ('Cancelled')
          AND date_requested >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)
        GROUP BY month_key, month_label
        ORDER BY month_key ASC
    ")->fetchAll();

    // ── INVENTORY STATS ──────────────────────────────────────
    $lowStock      = (int) $pdo->query("SELECT COUNT(*) FROM inventory WHERE stock <= reorder_level AND stock > 0 AND is_active = 1")->fetchColumn();
    $highStock     = (int) $pdo->query("SELECT COUNT(*) FROM inventory WHERE stock > reorder_level * 5 AND is_active = 1")->fetchColumn();
    $outOfStock    = (int) $pdo->query("SELECT COUNT(*) FROM inventory WHERE stock = 0 AND is_active = 1")->fetchColumn();
    $totalInventory= (int) $pdo->query("SELECT COUNT(*) FROM inventory WHERE is_active = 1")->fetchColumn();

    // ── RECENT ORDERS (latest 5) ─────────────────────────────
    $recentOrders = $pdo->query("
        SELECT
            o.order_id,
            CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
            (SELECT p.name FROM order_details od JOIN products p ON p.product_id = od.product_id WHERE od.order_id = o.order_id LIMIT 1) AS product_name,
            o.order_status,
            DATE_FORMAT(o.date_requested, '%b %d, %Y') AS date_requested
        FROM orders o
        LEFT JOIN customers c ON o.customer_id = c.customer_id
        LEFT JOIN users u ON c.user_id = u.user_id
        ORDER BY o.date_requested DESC
        LIMIT 5
    ")->fetchAll();

    // ── CUSTOMER STATS ───────────────────────────────────────
    $totalCustomers = (int) $pdo->query(
        "SELECT COUNT(*) FROM users WHERE role = 'customer'"
    )->fetchColumn();

    // Repeat customers = placed more than 1 order
    $repeatCustomers = (int) $pdo->query("
        SELECT COUNT(*) FROM (
            SELECT customer_id
            FROM orders
            WHERE customer_id IS NOT NULL
            GROUP BY customer_id
            HAVING COUNT(*) > 1
        ) AS repeats
    ")->fetchColumn();

    // Total revenue (all completed orders)
    $totalRevenue = (float) $pdo->query("
        SELECT COALESCE(SUM(total_amount), 0)
        FROM orders
        WHERE order_status = 'Completed'
    ")->fetchColumn();

    // Current month revenue
    $currentRevenue = (float) $pdo->query("
        SELECT COALESCE(SUM(total_amount), 0)
        FROM orders
        WHERE order_status NOT IN ('Cancelled')
          AND MONTH(date_requested) = MONTH(CURDATE())
          AND YEAR(date_requested) = YEAR(CURDATE())
    ")->fetchColumn();

    // Monthly customers (unique customers who ordered each month, last 12 months)
    $monthlyCustomers = $pdo->query("
        SELECT
            DATE_FORMAT(date_requested, '%b') AS month_label,
            DATE_FORMAT(date_requested, '%Y-%m') AS month_key,
            COUNT(DISTINCT customer_id) AS customers
        FROM orders
        WHERE date_requested >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)
        GROUP BY month_key, month_label
        ORDER BY month_key ASC
    ")->fetchAll();

    // ── BUILD RESPONSE ────────────────────────────────────────
    echo json_encode([
        'success' => true,
        'orders' => [
            'total'       => $totalOrders,
            'due_today'   => $ordersDueToday,
            'pending'     => $pendingOrders,
            'processing'  => $processingOrders,
            'completed'   => $completedOrders,
            'cancelled'   => $cancelledOrders,
        ],
        'monthly_orders'   => $monthlyOrders,
        'monthly_sales'    => $monthlySales,
        'inventory' => [
            'low_stock'    => $lowStock,
            'high_stock'   => $highStock,
            'out_of_stock' => $outOfStock,
            'total'        => $totalInventory,
        ],
        'recent_orders'    => $recentOrders,
        'customers' => [
            'total'          => $totalCustomers,
            'repeat'         => $repeatCustomers,
            'total_revenue'  => $totalRevenue,
            'current_revenue'=> $currentRevenue,
        ],
        'monthly_customers' => $monthlyCustomers,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
