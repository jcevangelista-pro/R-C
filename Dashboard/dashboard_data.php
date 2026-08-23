<?php
// ============================================================
// Dashboard Data API
// Returns JSON with all stats needed by Dashboard.html
// ============================================================

require_once __DIR__ . '/../database/api_bootstrap.php';
require_role(['admin', 'owner']);

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

    $processOverview = $pdo->query("
        SELECT ps.step_number, ps.step_name, COUNT(op.process_id) AS orders
        FROM process_steps ps
        LEFT JOIN order_process op ON op.process_step_id=ps.process_step_id AND op.status='In Progress'
        GROUP BY ps.process_step_id, ps.step_number, ps.step_name ORDER BY ps.step_number
    ")->fetchAll();

    $attentionOrders = $pdo->query("
        SELECT o.order_id, o.order_status, o.payment_status, o.total_amount,
               CONCAT(u.first_name,' ',u.last_name) customer_name,
               COALESCE(ps.step_name,'Awaiting Acceptance') attention_stage
        FROM orders o JOIN customers c ON c.customer_id=o.customer_id JOIN users u ON u.user_id=c.user_id
        LEFT JOIN order_process op ON op.order_id=o.order_id AND op.status='In Progress'
        LEFT JOIN process_steps ps ON ps.process_step_id=op.process_step_id
        WHERE o.order_status='Pending' OR (o.order_status='In Progress' AND (ps.step_number IN (2,3,5) OR o.payment_status!='Paid'))
        ORDER BY o.updated_at DESC LIMIT 20
    ")->fetchAll();

    $inventoryItems = $pdo->query("SELECT inventory_id,item_name,category,stock,unit_of_measure,reorder_level,unit_cost FROM inventory WHERE is_active=1 ORDER BY item_name")->fetchAll();
    $recentInventory = $pdo->query("SELECT ih.history_id,ih.action,ih.quantity,ih.stock_before,ih.stock_after,ih.order_id,ih.reason,ih.created_at,i.item_name,CONCAT(u.first_name,' ',u.last_name) updated_by_name FROM inventory_history ih JOIN inventory i ON i.inventory_id=ih.inventory_id LEFT JOIN users u ON u.user_id=ih.updated_by ORDER BY ih.created_at DESC LIMIT 20")->fetchAll();
    $unreadNotifications = 0;
    if (current_user_id()) {
        $unreadStmt = $pdo->prepare("SELECT COUNT(*) FROM notifications WHERE user_id=? AND is_read=0");
        $unreadStmt->execute([current_user_id()]);
        $unreadNotifications = (int)$unreadStmt->fetchColumn();
    }

    $periodStart = $_GET['start'] ?? date('Y-m-01');
    $periodEnd = $_GET['end'] ?? date('Y-m-d');
    foreach ([$periodStart,$periodEnd] as $dateValue) {
        $parsed = DateTime::createFromFormat('Y-m-d', $dateValue);
        if (!$parsed || $parsed->format('Y-m-d') !== $dateValue) api_error('Invalid dashboard date range.', 422);
    }
    if ($periodStart > $periodEnd) api_error('Dashboard start date must not be after end date.', 422);
    $periodOrdersStmt = $pdo->prepare("SELECT COUNT(*) order_count,COALESCE(SUM(total_amount),0) order_total FROM orders WHERE order_status!='Cancelled' AND DATE(date_requested) BETWEEN ? AND ?");
    $periodOrdersStmt->execute([$periodStart,$periodEnd]);
    $periodSummary = $periodOrdersStmt->fetch();
    $periodPaymentsStmt = $pdo->prepare("SELECT COALESCE(SUM(amount),0) collected_payments FROM payments WHERE status='Verified' AND DATE(verified_at) BETWEEN ? AND ?");
    $periodPaymentsStmt->execute([$periodStart,$periodEnd]);
    $periodSummary['collected_payments'] = (float)$periodPaymentsStmt->fetchColumn();
    $periodSummary['start'] = $periodStart;
    $periodSummary['end'] = $periodEnd;

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
        'process_overview' => $processOverview,
        'attention_orders' => $attentionOrders,
        'inventory_items' => $inventoryItems,
        'recent_inventory_activity' => $recentInventory,
        'unread_notifications' => $unreadNotifications,
        'period_summary' => $periodSummary,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
