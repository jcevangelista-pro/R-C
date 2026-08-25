<?php
require_once __DIR__ . '/../database/api_bootstrap.php';
require_role(['admin', 'owner']);

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
    $contentType = strtolower($_SERVER['CONTENT_TYPE'] ?? '');
    $body = str_contains($contentType, 'multipart/form-data') ? $_POST : json_body();
    $action = $body['action'] ?? '';

    if ($method === 'POST') {

        if ($action === 'accept') {
            $orderId = $body['order_id'] ?? '';
            $userId = $_SESSION['user_id'] ?? null;
            if (!$orderId) { echo json_encode(['success' => false, 'error' => 'Order ID required.']); exit; }

            require_order_access($pdo, $orderId, true);
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("UPDATE orders SET order_status = 'In Progress', accepted_by = ?, date_accepted = NOW() WHERE order_id = ? AND order_status='Pending'");
            $stmt->execute([$userId, $orderId]);
            if ($stmt->rowCount() !== 1) { $pdo->rollBack(); api_error('Only a pending order can be accepted.', 409); }

            // Create all 8 process steps for this order
            $stmt = $pdo->prepare("SELECT process_step_id FROM process_steps ORDER BY step_number");
            $stmt->execute();
            $stepIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

            foreach ($stepIds as $index => $stepId) {
                $status = ($index === 0) ? 'Completed' : (($index === 1) ? 'In Progress' : 'Pending');
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

            audit_event($pdo, 'order.accepted', $orderId);
            $pdo->commit();

            echo json_encode(['success' => true, 'message' => 'Order accepted.']);
            exit;
        }

        if ($action === 'reject') {
            $orderId = $body['order_id'] ?? '';
            if (!$orderId) { echo json_encode(['success' => false, 'error' => 'Order ID required.']); exit; }

            require_order_access($pdo, $orderId, true);
            $stmt = $pdo->prepare("UPDATE orders SET order_status = 'Cancelled', date_finished=NOW() WHERE order_id = ? AND order_status='Pending'");
            $stmt->execute([$orderId]);
            if ($stmt->rowCount() !== 1) api_error('Only a pending order can be rejected.', 409);
            echo json_encode(['success' => true, 'message' => 'Order rejected.']);
            exit;
        }

        if ($action === 'complete') {
            $orderId = $body['order_id'] ?? '';
            if (!$orderId) { echo json_encode(['success' => false, 'error' => 'Order ID required.']); exit; }

            require_order_access($pdo, $orderId, true);
            $stmt = $pdo->prepare("UPDATE orders SET order_status = 'Completed', date_finished = NOW() WHERE order_id = ? AND order_status='In Progress'");
            $stmt->execute([$orderId]);
            echo json_encode(['success' => true, 'message' => 'Order completed.']);
            exit;
        }

        // Get process steps for an order
        if ($action === 'get_steps') {
            $orderId = $body['order_id'] ?? '';
            if (!$orderId) { echo json_encode(['success' => false, 'error' => 'Order ID required.']); exit; }

            $stmt = $pdo->prepare("
                SELECT op.process_id, op.status, op.process_date, op.notes, op.image, op.completed_at, ps.step_number, ps.step_name,
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
                       o.quotation_amount, o.quotation_notes, o.quotation_status,
                       o.payment_method, o.payment_type, o.reference_number, o.payment_screenshot,
                       o.amount_paid, o.remaining_balance, o.payment_status, o.rush_fee, o.delivery_fee,
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

            if ($discountPercent < 0 || $discountPercent > 100) api_error('Discount must be between 0 and 100.', 422);
            require_order_access($pdo, $orderId, true);
            $stmt = $pdo->prepare("UPDATE orders SET discount_percent=? WHERE order_id=?");
            $stmt->execute([$discountPercent, $orderId]);
            $totals = calculate_order_totals($pdo, $orderId);
            $amountDeducted = $totals['amount_deducted'];
            $newTotal = $totals['total_amount'];

            echo json_encode(['success' => true, 'message' => 'Discount applied.', 'amount_deducted' => $amountDeducted, 'new_total' => $newTotal]);
            exit;
        }

        if ($action === 'save_quotation') {
            $orderId = trim($body['order_id'] ?? '');
            $amount = (float)($body['quotation_amount'] ?? 0);
            $notes = trim($body['quotation_notes'] ?? '');
            if (!$orderId || $amount < 0) api_error('A valid order and quotation amount are required.', 422);
            require_order_access($pdo, $orderId, true);
            $stmt = $pdo->prepare("UPDATE orders SET quotation_amount=?, quotation_notes=?, quotation_status=IF(quotation_status='Accepted','Revised','Sent'), quotation_created_by=?, quotation_sent_at=NOW() WHERE order_id=? AND order_status='In Progress'");
            $stmt->execute([$amount,$notes ?: null,current_user_id(),$orderId]);
            if ($stmt->rowCount() !== 1) api_error('Quotation cannot be updated for this order.', 409);
            audit_event($pdo, 'quotation.sent', $orderId, ['amount'=>$amount]);
            echo json_encode(['success'=>true,'message'=>'Quotation sent.']);
            exit;
        }

        if ($action === 'save_evidence') {
            $orderId = trim($body['order_id'] ?? '');
            $stepNumber = (int)($body['step_number'] ?? 0);
            $notes = trim($body['notes'] ?? '');
            if (!$orderId || $stepNumber < 1 || $stepNumber > 8) api_error('Valid order and process step are required.', 422);
            require_order_access($pdo, $orderId, true);
            $image = isset($_FILES['evidence']) ? store_image_upload($_FILES['evidence'], 'process-evidence') : null;
            $sql = "UPDATE order_process op JOIN process_steps ps ON ps.process_step_id=op.process_step_id SET op.notes=?,op.process_date=CURDATE()";
            $params = [$notes ?: null];
            if ($image) { $sql .= ",op.image=?"; $params[] = $image; }
            $sql .= " WHERE op.order_id=? AND ps.step_number=?";
            array_push($params,$orderId,$stepNumber);
            $pdo->prepare($sql)->execute($params);
            audit_event($pdo, 'order.evidence_saved', $orderId, ['step_number'=>$stepNumber,'has_image'=>(bool)$image]);
            echo json_encode(['success'=>true,'message'=>'Process evidence saved.','image'=>$image]);
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

            require_order_access($pdo, $orderId, true);
            $pdo->beginTransaction();
            $lock = $pdo->prepare("SELECT o.order_status, o.inventory_deducted_at, o.payment_type, op.status FROM orders o JOIN order_process op ON op.order_id=o.order_id JOIN process_steps ps ON ps.process_step_id=op.process_step_id WHERE o.order_id=? AND ps.step_number=? FOR UPDATE");
            $lock->execute([$orderId, $stepNumber]);
            $state = $lock->fetch();
            if (!$state || $state['order_status'] !== 'In Progress' || $state['status'] !== 'In Progress') {
                $pdo->rollBack(); api_error('This is not the current active order step.', 409);
            }

            $skipFinalPayment = $stepNumber === 5 && $state['payment_type'] === 'Full Payment';

            if (in_array($stepNumber, [3, 5], true) && !$skipFinalPayment) {
                $paymentType = $stepNumber === 3 ? ['Full Payment','50% Down Payment'] : ['Final Payment'];
                $marks = implode(',', array_fill(0, count($paymentType), '?'));
                $params = array_merge([$userId], $paymentType, [$orderId]);
                $verify = $pdo->prepare("UPDATE payments SET status='Verified', verified_by=?, verified_at=NOW() WHERE payment_type IN ($marks) AND order_id=? AND status='Submitted'");
                $verify->execute($params);
                if ($verify->rowCount() < 1) { $pdo->rollBack(); api_error('A submitted payment is required before approving this step.', 409); }
                $paid = $pdo->prepare("SELECT COALESCE(SUM(amount),0) FROM payments WHERE order_id=? AND status='Verified'");
                $paid->execute([$orderId]);
                $amountPaid = round((float)$paid->fetchColumn(), 2);
                $totalStmt = $pdo->prepare("SELECT total_amount FROM orders WHERE order_id=?");
                $totalStmt->execute([$orderId]);
                $totalAmount = (float)$totalStmt->fetchColumn();
                $remaining = max(0, round($totalAmount-$amountPaid, 2));
                $paymentStatus = $amountPaid <= 0 ? 'Unpaid' : ($remaining > 0 ? 'Partial' : 'Paid');
                $pdo->prepare("UPDATE orders SET amount_paid=?,remaining_balance=?,payment_status=? WHERE order_id=?")->execute([$amountPaid,$remaining,$paymentStatus,$orderId]);
            }

            // Mark current step as completed
            $stmt = $pdo->prepare("
                UPDATE order_process op
                JOIN process_steps ps ON ps.process_step_id = op.process_step_id
                SET op.status = ?, op.completed_by = ?, op.completed_at = NOW()
                WHERE op.order_id = ? AND ps.step_number = ?
            ");
            $stmt->execute([$skipFinalPayment ? 'Skipped' : 'Completed', $userId, $orderId, $stepNumber]);

            // ── STEP 4: Deduct inventory materials ─────────────
            if ($stepNumber === 4) {
                $deliveryFee = filter_var($body['delivery_fee'] ?? null, FILTER_VALIDATE_FLOAT);
                if ($deliveryFee === false || $deliveryFee < 0 || $deliveryFee > 99999999.99) {
                    $pdo->rollBack(); api_error('A valid delivery fee is required.', 422);
                }
                $pdo->prepare("UPDATE orders SET delivery_fee=? WHERE order_id=?")->execute([round($deliveryFee, 2), $orderId]);
                calculate_order_totals($pdo, $orderId);

                if ($state['inventory_deducted_at']) { $pdo->rollBack(); api_error('Inventory was already deducted for this order.', 409); }
                $missing = $pdo->prepare("SELECT p.name FROM order_details od JOIN products p ON p.product_id=od.product_id LEFT JOIN product_materials pm ON pm.product_id=p.product_id WHERE od.order_id=? GROUP BY p.product_id,p.name HAVING COUNT(pm.product_material_id)=0");
                $missing->execute([$orderId]);
                $missingNames = $missing->fetchAll(PDO::FETCH_COLUMN);
                if ($missingNames) { $pdo->rollBack(); api_error('BOM is required for every product: '.implode(', ', $missingNames), 409); }

                $requirements = $pdo->prepare("SELECT pm.inventory_id, i.item_name, SUM(pm.quantity_required*od.quantity) required_qty FROM order_details od JOIN product_materials pm ON pm.product_id=od.product_id JOIN inventory i ON i.inventory_id=pm.inventory_id WHERE od.order_id=? GROUP BY pm.inventory_id,i.item_name ORDER BY pm.inventory_id FOR UPDATE");
                $requirements->execute([$orderId]);
                $materials = $requirements->fetchAll();
                $stockStmt = $pdo->prepare("SELECT stock FROM inventory WHERE inventory_id=? AND is_active=1 FOR UPDATE");
                foreach ($materials as &$material) {
                    $stockStmt->execute([$material['inventory_id']]);
                    $stock = $stockStmt->fetchColumn();
                    if ($stock === false) { $pdo->rollBack(); api_error('A required material is archived or missing: '.$material['item_name'], 409); }
                    $material['stock_before'] = (float)$stock;
                    if ((float)$stock < (float)$material['required_qty']) { $pdo->rollBack(); api_error('Insufficient stock for '.$material['item_name'].'.', 409); }
                }
                unset($material);
                $updateStock = $pdo->prepare("UPDATE inventory SET stock=? WHERE inventory_id=?");
                $history = $pdo->prepare("INSERT INTO inventory_history (inventory_id,order_id,action,quantity,stock_before,stock_after,reason,updated_by) VALUES (?,?,'Deducted',?,?,?,?,?)");
                foreach ($materials as $material) {
                    $after = round($material['stock_before']-(float)$material['required_qty'], 2);
                    $updateStock->execute([$after,$material['inventory_id']]);
                    $history->execute([$material['inventory_id'],$orderId,$material['required_qty'],$material['stock_before'],$after,"Automatic BOM deduction for $orderId",$userId]);
                }
                $pdo->prepare("UPDATE orders SET inventory_deducted_at=NOW() WHERE order_id=?")->execute([$orderId]);
            }
            // ── END inventory deduction ─────────────────────────

            // If step 8, mark order as completed
            if ($stepNumber >= 8) {
                $stmt = $pdo->prepare("UPDATE orders SET order_status = 'Completed', date_finished = NOW() WHERE order_id = ?");
                $stmt->execute([$orderId]);
            } else {
                // Mark next step as In Progress
                $nextStep = $stepNumber + 1;
                if ($stepNumber === 4 && $state['payment_type'] === 'Full Payment') {
                    $pdo->prepare("
                        UPDATE order_process op
                        JOIN process_steps ps ON ps.process_step_id = op.process_step_id
                        SET op.status = 'Skipped', op.completed_by = ?, op.completed_at = NOW()
                        WHERE op.order_id = ? AND ps.step_number = 5
                    ")->execute([$userId, $orderId]);
                    $nextStep = 6;
                }
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

            audit_event($pdo, 'order.step_advanced', $orderId, ['step_number'=>$stepNumber]);
            $pdo->commit();

            echo json_encode(['success' => true, 'message' => 'Step advanced.']);
            exit;
        }

        echo json_encode(['success' => false, 'error' => 'Invalid action.']);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed.']);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    error_log($e->__toString());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Unable to process the order request.']);
}
