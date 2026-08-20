<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../database/connection.php';

$method = $_SERVER['REQUEST_METHOD'];

try {

    // ── GET: return all order data for admin panel ──────────
    if ($method === 'GET') {

        // Stats
        $totalOrders     = (int) $pdo->query("SELECT COUNT(*) FROM orders")->fetchColumn();
        $completedOrders = (int) $pdo->query("SELECT COUNT(*) FROM orders WHERE order_status = 'Completed'")->fetchColumn();
        $cancelledOrders = (int) $pdo->query("SELECT COUNT(*) FROM orders WHERE order_status = 'Cancelled'")->fetchColumn();
        $pendingOrders   = (int) $pdo->query("SELECT COUNT(*) FROM orders WHERE order_status = 'Pending'")->fetchColumn();
        $processingOrders= (int) $pdo->query("SELECT COUNT(*) FROM orders WHERE order_status = 'In Progress'")->fetchColumn();
        $dueToday        = (int) $pdo->query("SELECT COUNT(*) FROM orders WHERE DATE(delivery_date) = CURDATE()")->fetchColumn();

        // Pending orders (non-rush)
        $pending = $pdo->query("
            SELECT o.order_id, 
                   CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
                   (SELECT p.name FROM order_details od JOIN products p ON p.product_id = od.product_id WHERE od.order_id = o.order_id LIMIT 1) AS product_name,
                   o.total_amount,
                   o.is_rush
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            JOIN users u ON c.user_id = u.user_id
            WHERE o.order_status = 'Pending' AND o.is_rush = 0
            ORDER BY o.date_requested DESC
        ")->fetchAll();

        // Pending orders (rush)
        $pendingRush = $pdo->query("
            SELECT o.order_id, 
                   CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
                   (SELECT p.name FROM order_details od JOIN products p ON p.product_id = od.product_id WHERE od.order_id = o.order_id LIMIT 1) AS product_name,
                   o.total_amount,
                   o.is_rush
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            JOIN users u ON c.user_id = u.user_id
            WHERE o.order_status = 'Pending' AND o.is_rush = 1
            ORDER BY o.date_requested DESC
        ")->fetchAll();

        // Orders history (completed + cancelled)
        $history = $pdo->query("
            SELECT o.order_id,
                   DATE_FORMAT(o.date_requested, '%Y-%m-%d') AS date_requested,
                   CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
                   (SELECT p.name FROM order_details od JOIN products p ON p.product_id = od.product_id WHERE od.order_id = o.order_id LIMIT 1) AS product_name,
                   o.total_amount,
                   o.order_status,
                   CONCAT(a.first_name, ' ', a.last_name) AS accepted_by_name,
                   DATE_FORMAT(o.date_requested, '%b %d, %Y') AS date_requested_fmt,
                   DATE_FORMAT(o.date_requested, '%h:%i %p') AS time_requested,
                   DATE_FORMAT(o.date_accepted, '%b %d, %Y') AS date_accepted_fmt,
                   DATE_FORMAT(o.date_accepted, '%h:%i %p') AS time_accepted,
                   DATE_FORMAT(o.date_finished, '%b %d, %Y') AS date_finished_fmt,
                   DATE_FORMAT(o.date_finished, '%h:%i %p') AS time_finished
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            JOIN users u ON c.user_id = u.user_id
            LEFT JOIN users a ON o.accepted_by = a.user_id
            WHERE o.order_status IN ('Completed', 'Cancelled')
            ORDER BY o.date_finished DESC, o.date_requested DESC
            LIMIT 50
        ")->fetchAll();

        // In-progress orders (for Order Process section)
        $inProgress = $pdo->query("
            SELECT o.order_id,
                   CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
                   (SELECT p.name FROM order_details od JOIN products p ON p.product_id = od.product_id WHERE od.order_id = o.order_id LIMIT 1) AS product_name,
                   o.total_amount,
                   o.order_status
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            JOIN users u ON c.user_id = u.user_id
            WHERE o.order_status = 'In Progress'
            ORDER BY o.date_accepted DESC
        ")->fetchAll();

        echo json_encode([
            'success' => true,
            'stats' => [
                'total' => $totalOrders,
                'completed' => $completedOrders,
                'cancelled' => $cancelledOrders,
                'pending' => $pendingOrders,
                'processing' => $processingOrders,
                'due_today' => $dueToday
            ],
            'pending' => $pending,
            'pending_rush' => $pendingRush,
            'history' => $history,
            'in_progress' => $inProgress
        ]);
        exit;
    }

    // ── POST: order actions ─────────────────────────────────
    $body = json_decode(file_get_contents('php://input'), true);
    $action = $body['action'] ?? '';

    if ($method === 'POST') {

        if ($action === 'accept') {
            $orderId = $body['order_id'] ?? '';
            $userId = $_SESSION['user_id'] ?? null;
            if (!$orderId) { echo json_encode(['success' => false, 'error' => 'Order ID required.']); exit; }

            $stmt = $pdo->prepare("UPDATE orders SET order_status = 'In Progress', accepted_by = ?, date_accepted = NOW() WHERE order_id = ?");
            $stmt->execute([$userId, $orderId]);
            echo json_encode(['success' => true, 'message' => 'Order accepted.']);
            exit;
        }

        if ($action === 'reject') {
            $orderId = $body['order_id'] ?? '';
            if (!$orderId) { echo json_encode(['success' => false, 'error' => 'Order ID required.']); exit; }

            $stmt = $pdo->prepare("UPDATE orders SET order_status = 'Cancelled' WHERE order_id = ?");
            $stmt->execute([$orderId]);
            echo json_encode(['success' => true, 'message' => 'Order rejected.']);
            exit;
        }

        if ($action === 'complete') {
            $orderId = $body['order_id'] ?? '';
            if (!$orderId) { echo json_encode(['success' => false, 'error' => 'Order ID required.']); exit; }

            $stmt = $pdo->prepare("UPDATE orders SET order_status = 'Completed', date_finished = NOW() WHERE order_id = ?");
            $stmt->execute([$orderId]);
            echo json_encode(['success' => true, 'message' => 'Order completed.']);
            exit;
        }

        echo json_encode(['success' => false, 'error' => 'Invalid action.']);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed.']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
