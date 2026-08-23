<?php
require_once __DIR__ . '/../database/api_bootstrap.php';
require_role(['customer']);

$userId = $_SESSION['user_id'] ?? null;
$customerId = null;

if ($userId) {
    $stmt = $pdo->prepare("SELECT customer_id FROM customers WHERE user_id = ?");
    $stmt->execute([$userId]);
    $customerId = $stmt->fetchColumn();
}

try {
    if (!$customerId) {
        echo json_encode(['success' => true, 'orders' => []]);
        exit;
    }

    // Get all orders for this customer with their line items
    $stmt = $pdo->prepare("
        SELECT 
            o.order_id,
            o.order_status,
            o.payment_status,
            o.total_amount,
            o.is_rush,
            o.customization_type,
            o.delivery_method,
            DATE_FORMAT(o.date_requested, '%b %d, %Y') AS date_requested,
            DATE_FORMAT(o.date_requested, '%h:%i %p') AS time_requested
        FROM orders o
        WHERE o.customer_id = ?
        ORDER BY o.date_requested DESC
    ");
    $stmt->execute([$customerId]);
    $orders = $stmt->fetchAll();

    // For each order, get its items
    foreach ($orders as &$order) {
        $stmt2 = $pdo->prepare("
            SELECT 
                od.product_id,
                p.name,
                p.type_of_product AS category,
                p.image_path,
                od.quantity AS qty,
                od.unit_price AS price
            FROM order_details od
            JOIN products p ON p.product_id = od.product_id
            WHERE od.order_id = ?
        ");
        $stmt2->execute([$order['order_id']]);
        $order['items'] = $stmt2->fetchAll();

        // Map status for display
        $status = $order['order_status'];
        if ($status === 'Pending') {
            $order['display_status'] = 'PENDING VERIFICATION';
        } elseif ($status === 'In Progress') {
            $order['display_status'] = 'PROCESSING';
        } elseif ($status === 'Completed') {
            $order['display_status'] = 'COMPLETED';
        } elseif ($status === 'Cancelled') {
            $order['display_status'] = 'CANCELLED';
        } else {
            $order['display_status'] = strtoupper($status);
        }
    }
    unset($order);

    echo json_encode(['success' => true, 'orders' => $orders]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
