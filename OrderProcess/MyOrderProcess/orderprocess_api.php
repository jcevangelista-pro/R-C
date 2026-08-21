<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../../database/connection.php';

$method = $_SERVER['REQUEST_METHOD'];
$userId = $_SESSION['user_id'] ?? null;

try {

    // ── GET: get order process data ─────────────────────────
    if ($method === 'GET') {
        $orderId = $_GET['order_id'] ?? '';

        if (!$orderId) {
            echo json_encode(['success' => false, 'error' => 'Order ID required.']);
            exit;
        }

        // Get order info
        $stmt = $pdo->prepare("
            SELECT o.*, 
                   CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
                   c.phone_num, c.address, c.user_id AS customer_user_id
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            JOIN users u ON c.user_id = u.user_id
            WHERE o.order_id = ?
        ");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();

        if (!$order) {
            echo json_encode(['success' => false, 'error' => 'Order not found.']);
            exit;
        }

        // Check ownership: only the customer who placed the order can access
        if (!$userId || (int)$order['customer_user_id'] !== (int)$userId) {
            echo json_encode(['success' => false, 'error' => 'unauthorized']);
            exit;
        }

        // Remove internal field before sending
        unset($order['customer_user_id']);

        // Get order items
        $stmt = $pdo->prepare("
            SELECT od.*, p.name, p.type_of_product, p.image_path
            FROM order_details od
            JOIN products p ON p.product_id = od.product_id
            WHERE od.order_id = ?
        ");
        $stmt->execute([$orderId]);
        $items = $stmt->fetchAll();

        // Get process steps
        $stmt = $pdo->prepare("
            SELECT op.*, ps.step_number, ps.step_name
            FROM order_process op
            JOIN process_steps ps ON ps.process_step_id = op.process_step_id
            WHERE op.order_id = ?
            ORDER BY ps.step_number
        ");
        $stmt->execute([$orderId]);
        $steps = $stmt->fetchAll();

        // Get messages/notifications for this order
        $stmt = $pdo->prepare("
            SELECT n.*, 
                   CONCAT(sender.first_name, ' ', sender.last_name) AS sender_name,
                   sender.role AS sender_role,
                   op.process_step_id,
                   ps.step_number
            FROM notifications n
            JOIN order_process op ON op.process_id = n.process_id
            JOIN process_steps ps ON ps.process_step_id = op.process_step_id
            JOIN users sender ON sender.user_id = n.sent_by
            WHERE op.order_id = ?
            ORDER BY n.created_at ASC
        ");
        $stmt->execute([$orderId]);
        $messages = $stmt->fetchAll();

        echo json_encode([
            'success' => true,
            'order' => $order,
            'items' => $items,
            'steps' => $steps,
            'messages' => $messages
        ]);
        exit;
    }

    // ── POST: actions ───────────────────────────────────────
    if ($method === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true);
        $action = $body['action'] ?? '';

        // Submit initial payment (Step 3)
        if ($action === 'submit_payment') {
            $orderId = $body['order_id'] ?? '';
            $paymentMethod = $body['payment_method'] ?? '';
            $paymentType = $body['payment_type'] ?? '';
            $referenceNumber = trim($body['reference_number'] ?? '');

            if (!$orderId || !$paymentMethod || !$paymentType) {
                echo json_encode(['success' => false, 'error' => 'Order ID, payment method, and payment type are required.']);
                exit;
            }

            $stmt = $pdo->prepare("
                UPDATE orders SET payment_method = ?, payment_type = ?, reference_number = ?, payment_status = 'Partial'
                WHERE order_id = ?
            ");
            $stmt->execute([$paymentMethod, $paymentType, $referenceNumber, $orderId]);

            // Calculate amount paid based on payment type
            $stmt = $pdo->prepare("SELECT product_total, amount_deducted, rush_fee FROM orders WHERE order_id = ?");
            $stmt->execute([$orderId]);
            $order = $stmt->fetch();
            $newTotal = (float)$order['product_total'] - (float)$order['amount_deducted'] + (float)$order['rush_fee'];

            $amountPaid = $paymentType === 'Full Payment' ? $newTotal : round($newTotal * 0.5, 2);
            $remaining = $newTotal - $amountPaid;

            $stmt = $pdo->prepare("UPDATE orders SET amount_paid = ?, remaining_balance = ? WHERE order_id = ?");
            $stmt->execute([$amountPaid, $remaining, $orderId]);

            echo json_encode(['success' => true, 'message' => 'Payment submitted.']);
            exit;
        }

        // Submit final payment (Step 5)
        if ($action === 'submit_final_payment') {
            $orderId = $body['order_id'] ?? '';
            $referenceNumber = trim($body['reference_number'] ?? '');

            if (!$orderId) {
                echo json_encode(['success' => false, 'error' => 'Order ID required.']);
                exit;
            }

            // Mark as fully paid
            $stmt = $pdo->prepare("
                UPDATE orders SET payment_status = 'Paid', remaining_balance = 0, reference_number = ?
                WHERE order_id = ?
            ");
            $stmt->execute([$referenceNumber, $orderId]);

            // Update amount_paid to total_amount
            $stmt = $pdo->prepare("UPDATE orders SET amount_paid = total_amount WHERE order_id = ?");
            $stmt->execute([$orderId]);

            echo json_encode(['success' => true, 'message' => 'Final payment submitted.']);
            exit;
        }

        // Send message
        if ($action === 'send_message') {
            $orderId = $body['order_id'] ?? '';
            $stepNumber = (int)($body['step_number'] ?? 0);
            $message = trim($body['message'] ?? '');

            if (!$orderId || !$stepNumber || !$message) {
                echo json_encode(['success' => false, 'error' => 'Order ID, step, and message are required.']);
                exit;
            }

            if (!$userId) {
                echo json_encode(['success' => false, 'error' => 'You must be logged in.']);
                exit;
            }

            // Get or create the process record for this step
            $stmt = $pdo->prepare("
                SELECT op.process_id FROM order_process op
                JOIN process_steps ps ON ps.process_step_id = op.process_step_id
                WHERE op.order_id = ? AND ps.step_number = ?
            ");
            $stmt->execute([$orderId, $stepNumber]);
            $processId = $stmt->fetchColumn();

            if (!$processId) {
                // Create the process step entry
                $stmt = $pdo->prepare("SELECT process_step_id FROM process_steps WHERE step_number = ?");
                $stmt->execute([$stepNumber]);
                $stepId = $stmt->fetchColumn();

                if (!$stepId) {
                    echo json_encode(['success' => false, 'error' => 'Invalid step number.']);
                    exit;
                }

                $stmt = $pdo->prepare("INSERT INTO order_process (order_id, process_step_id, status) VALUES (?, ?, 'In Progress')");
                $stmt->execute([$orderId, $stepId]);
                $processId = $pdo->lastInsertId();
            }

            // Determine recipient (if sender is customer, send to admin/owner who accepted; otherwise send to customer)
            $stmt = $pdo->prepare("SELECT customer_id, accepted_by FROM orders WHERE order_id = ?");
            $stmt->execute([$orderId]);
            $orderInfo = $stmt->fetch();

            $senderRole = $_SESSION['role'] ?? 'customer';
            if ($senderRole === 'customer') {
                $recipientId = $orderInfo['accepted_by'] ?: 1; // fallback to user 1 (owner)
            } else {
                // Get customer's user_id
                $stmt = $pdo->prepare("SELECT user_id FROM customers WHERE customer_id = ?");
                $stmt->execute([$orderInfo['customer_id']]);
                $recipientId = $stmt->fetchColumn();
            }

            // Insert notification/message
            $stmt = $pdo->prepare("
                INSERT INTO notifications (process_id, user_id, sent_by, title, message)
                VALUES (?, ?, ?, ?, ?)
            ");
            $title = "Step $stepNumber Message";
            $stmt->execute([$processId, $recipientId, $userId, $title, $message]);

            echo json_encode(['success' => true, 'message' => 'Message sent.']);
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
