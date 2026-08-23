<?php
// ============================================================
// Customer API — returns customer list with their orders
// Used by CustomerLand.html
// ============================================================

require_once __DIR__ . '/../database/api_bootstrap.php';
require_role(['admin', 'owner']);

try {
    // Get all customers with user info
    $stmt = $pdo->query("
        SELECT 
            c.customer_id,
            CONCAT(u.first_name, IFNULL(CONCAT(' ', u.middle_name), ''), ' ', u.last_name) AS name,
            c.phone_num AS contact,
            c.address
        FROM customers c
        JOIN users u ON u.user_id = c.user_id
        WHERE u.is_active = 1
        ORDER BY u.last_name, u.first_name
    ");
    $customers = $stmt->fetchAll();

    // Also include customer-role users who haven't filled in the customers table yet
    $stmt2 = $pdo->query("
        SELECT 
            u.user_id,
            CONCAT(u.first_name, IFNULL(CONCAT(' ', u.middle_name), ''), ' ', u.last_name) AS name,
            u.email AS contact,
            '—' AS address
        FROM users u
        LEFT JOIN customers c ON c.user_id = u.user_id
        WHERE u.role = 'customer' AND u.is_active = 1 AND c.customer_id IS NULL
        ORDER BY u.last_name, u.first_name
    ");
    $unclaimed = $stmt2->fetchAll();

    // Merge: customers with profile first, then users without customer profile
    $allCustomers = array_merge($customers, array_map(function($u) {
        return [
            'customer_id' => null,
            'name' => $u['name'],
            'contact' => $u['contact'],
            'address' => $u['address']
        ];
    }, $unclaimed));

    // Get orders for each customer
    foreach ($allCustomers as &$customer) {
        if ($customer['customer_id']) {
            $ordStmt = $pdo->prepare("
                SELECT 
                    od.order_detail_id,
                    p.name AS name,
                    p.type_of_product AS category,
                    od.quantity AS qty,
                    od.unit_price AS price,
                    o.order_status AS status,
                    o.payment_status, o.delivery_method, o.delivery_date, o.delivery_fee,
                    o.discount_percent, o.total_amount, o.amount_paid, o.is_rush,
                    o.date_requested, o.date_accepted, o.date_finished
                FROM orders o
                JOIN order_details od ON od.order_id = o.order_id
                JOIN products p ON p.product_id = od.product_id
                WHERE o.customer_id = ?
                ORDER BY o.date_requested DESC
            ");
            $ordStmt->execute([$customer['customer_id']]);
            $customer['orders'] = $ordStmt->fetchAll();

            // Map order_status to simpler display values
            foreach ($customer['orders'] as &$order) {
                $status = strtolower($order['status']);
                if ($status === 'completed' || $status === 'delivered') {
                    $order['status'] = 'Completed';
                } elseif ($status === 'cancelled') {
                    $order['status'] = 'Cancelled';
                } else {
                    $order['status'] = 'Pending';
                }
                $order['qty'] = (int)$order['qty'];
                unset($order['order_detail_id']);
            }
            unset($order);
        } else {
            $customer['orders'] = [];
        }

        // Remove customer_id from output (not needed by frontend)
        unset($customer['customer_id']);
    }
    unset($customer);

    echo json_encode(['success' => true, 'customers' => $allCustomers]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
