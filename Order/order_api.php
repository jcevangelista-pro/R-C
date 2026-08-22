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
                   o.order_status,
                   (SELECT ps.step_name FROM order_process op JOIN process_steps ps ON ps.process_step_id = op.process_step_id WHERE op.order_id = o.order_id AND op.status = 'In Progress' ORDER BY ps.step_number LIMIT 1) AS current_step,
                   (SELECT ps.step_number FROM order_process op JOIN process_steps ps ON ps.process_step_id = op.process_step_id WHERE op.order_id = o.order_id AND op.status = 'In Progress' ORDER BY ps.step_number LIMIT 1) AS current_step_number
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

            // Create all 8 process steps for this order
            $stmt = $pdo->prepare("SELECT process_step_id FROM process_steps ORDER BY step_number");
            $stmt->execute();
            $stepIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

            foreach ($stepIds as $index => $stepId) {
                $status = ($index === 0) ? 'Completed' : 'Pending';
                $stmtInsert = $pdo->prepare("
                    INSERT IGNORE INTO order_process (order_id, process_step_id, status, completed_by, completed_at)
                    VALUES (?, ?, ?, ?, ?)
                ");
                if ($index === 0) {
                    $stmtInsert->execute([$orderId, $stepId, $status, $userId, date('Y-m-d H:i:s')]);
                } else {
                    $stmtInsert->execute([$orderId, $stepId, $status, null, null]);
                }
            }

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

        // Get process steps for an order
        if ($action === 'get_steps') {
            $orderId = $body['order_id'] ?? '';
            if (!$orderId) { echo json_encode(['success' => false, 'error' => 'Order ID required.']); exit; }

            $stmt = $pdo->prepare("
                SELECT op.process_id, op.status, op.completed_at, ps.step_number, ps.step_name,
                       CONCAT(u.first_name, ' ', u.last_name) AS completed_by_name
                FROM order_process op
                JOIN process_steps ps ON ps.process_step_id = op.process_step_id
                LEFT JOIN users u ON u.user_id = op.completed_by
                WHERE op.order_id = ?
                ORDER BY ps.step_number
            ");
            $stmt->execute([$orderId]);
            $steps = $stmt->fetchAll();

            // Get order info
            $stmt = $pdo->prepare("
                SELECT o.order_id, o.order_status, o.total_amount, o.product_total,
                       o.discount_percent, o.amount_deducted, o.is_rush, o.customization_type,
                       o.delivery_method, o.delivery_address,
                       CONCAT(u.first_name, ' ', u.last_name) AS customer_name
                FROM orders o
                JOIN customers c ON o.customer_id = c.customer_id
                JOIN users u ON c.user_id = u.user_id
                WHERE o.order_id = ?
            ");
            $stmt->execute([$orderId]);
            $order = $stmt->fetch();

            // Get order items
            $stmt = $pdo->prepare("
                SELECT od.product_id, od.quantity, od.unit_price, p.name, p.type_of_product, p.image_path
                FROM order_details od
                JOIN products p ON p.product_id = od.product_id
                WHERE od.order_id = ?
            ");
            $stmt->execute([$orderId]);
            $items = $stmt->fetchAll();

            echo json_encode(['success' => true, 'steps' => $steps, 'order' => $order, 'items' => $items]);
            exit;
        }

        // Apply discount to an order
        if ($action === 'apply_discount') {
            $orderId = $body['order_id'] ?? '';
            $discountPercent = (float)($body['discount_percent'] ?? 0);

            if (!$orderId) { echo json_encode(['success' => false, 'error' => 'Order ID required.']); exit; }

            // Get product total
            $stmt = $pdo->prepare("SELECT product_total FROM orders WHERE order_id = ?");
            $stmt->execute([$orderId]);
            $productTotal = (float)$stmt->fetchColumn();

            $amountDeducted = round($productTotal * ($discountPercent / 100), 2);
            $newTotal = $productTotal - $amountDeducted;

            // Update order
            $stmt = $pdo->prepare("UPDATE orders SET discount_percent = ?, amount_deducted = ?, total_amount = ? + rush_fee + delivery_fee WHERE order_id = ?");
            $stmt->execute([$discountPercent, $amountDeducted, $newTotal, $orderId]);

            echo json_encode(['success' => true, 'message' => 'Discount applied.', 'amount_deducted' => $amountDeducted, 'new_total' => $newTotal]);
            exit;
        }

        // Advance to next step
        if ($action === 'advance_step') {
            $orderId = $body['order_id'] ?? '';
            $stepNumber = (int)($body['step_number'] ?? 0);
            $userId = $_SESSION['user_id'] ?? null;

            if (!$orderId || !$stepNumber) {
                echo json_encode(['success' => false, 'error' => 'Order ID and step number required.']);
                exit;
            }

            // Mark current step as completed
            $stmt = $pdo->prepare("
                UPDATE order_process op
                JOIN process_steps ps ON ps.process_step_id = op.process_step_id
                SET op.status = 'Completed', op.completed_by = ?, op.completed_at = NOW()
                WHERE op.order_id = ? AND ps.step_number = ?
            ");
            $stmt->execute([$userId, $orderId, $stepNumber]);

            // If step 8, mark order as completed
            if ($stepNumber >= 8) {
                $stmt = $pdo->prepare("UPDATE orders SET order_status = 'Completed', date_finished = NOW() WHERE order_id = ?");
                $stmt->execute([$orderId]);
            } else {
                // Mark next step as In Progress
                $nextStep = $stepNumber + 1;
                $stmt = $pdo->prepare("
                    UPDATE order_process op
                    JOIN process_steps ps ON ps.process_step_id = op.process_step_id
                    SET op.status = 'In Progress'
                    WHERE op.order_id = ? AND ps.step_number = ?
                ");
                $stmt->execute([$orderId, $nextStep]);
            }

            // Create notification for the customer
            $stmt = $pdo->prepare("SELECT customer_id FROM orders WHERE order_id = ?");
            $stmt->execute([$orderId]);
            $customerId = $stmt->fetchColumn();

            $stmt = $pdo->prepare("SELECT user_id FROM customers WHERE customer_id = ?");
            $stmt->execute([$customerId]);
            $customerUserId = $stmt->fetchColumn();

            if ($customerUserId) {
                // Get the process_id for this step
                $stmt = $pdo->prepare("
                    SELECT op.process_id FROM order_process op
                    JOIN process_steps ps ON ps.process_step_id = op.process_step_id
                    WHERE op.order_id = ? AND ps.step_number = ?
                ");
                $stmt->execute([$orderId, $stepNumber]);
                $processId = $stmt->fetchColumn();

                $stepNames = [1=>'Order Details',2=>'Verification',3=>'Initial Payment',4=>'Processing',5=>'Final Payment',6=>'Out for Delivery',7=>'Order Received',8=>'Order Completed'];
                $stepName = $stepNames[$stepNumber] ?? "Step $stepNumber";
                $title = "Step Approved: $stepName";
                $message = "Your order $orderId has been approved at step $stepNumber ($stepName).";

                $stmt = $pdo->prepare("INSERT INTO notifications (process_id, user_id, sent_by, title, message) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([$processId, $customerUserId, $userId, $title, $message]);
            }

            echo json_encode(['success' => true, 'message' => 'Step advanced.']);
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
