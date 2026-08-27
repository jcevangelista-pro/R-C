<?php
require_once __DIR__ . '/../database/api_bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'];
$userId = current_user_id();

if (!$userId) api_error('Not logged in.', 401);

try {

    // ── GET: list notifications ─────────────────────────────
    if ($method === 'GET') {
        $stmt = $pdo->prepare("
            SELECT n.notification_id, n.title, n.message, n.is_read, n.created_at,
                   CONCAT(sender.first_name, ' ', sender.last_name) AS sender_name,
                   sender.role AS sender_role,
                   op.order_id,
                   ps.step_number
            FROM notifications n
            JOIN users sender ON sender.user_id = n.sent_by
            LEFT JOIN order_process op ON op.process_id = n.process_id
            LEFT JOIN process_steps ps ON ps.process_step_id = op.process_step_id
            WHERE n.user_id = ?
            ORDER BY n.created_at DESC
            LIMIT 50
        ");
        $stmt->execute([$userId]);
        $notifications = $stmt->fetchAll();

        $unreadCount = 0;
        foreach ($notifications as &$n) {
            $n['is_read'] = (int)$n['is_read'];
            if (!$n['is_read']) $unreadCount++;
            $n['target_url'] = null;
            if (!empty($n['order_id'])) {
                $encodedOrder = rawurlencode((string)$n['order_id']);
                if (in_array(current_role(), ['admin', 'owner'], true)) {
                    $n['target_url'] = '../Order/order-admin.html?order=' . $encodedOrder;
                    if (!empty($n['step_number'])) $n['target_url'] .= '&step=' . (int)$n['step_number'];
                } else {
                    $n['target_url'] = '../OrderProcess/MyOrderProcess/MyOrderProcess.html?order=' . $encodedOrder;
                    if (!empty($n['step_number'])) $n['target_url'] .= '&step=' . (int)$n['step_number'];
                }
            }
        }
        unset($n);

        echo json_encode(['success' => true, 'notifications' => $notifications, 'unread_count' => $unreadCount]);
        exit;
    }

    // ── POST: mark as read ──────────────────────────────────
    if ($method === 'POST') {
        $body = json_body();
        $action = $body['action'] ?? '';

        if ($action === 'mark_read') {
            $notifId = (int)($body['notification_id'] ?? 0);
            if ($notifId) {
                $stmt = $pdo->prepare("UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?");
                $stmt->execute([$notifId, $userId]);
            }
            echo json_encode(['success' => true]);
            exit;
        }

        if ($action === 'mark_all_read') {
            $stmt = $pdo->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0");
            $stmt->execute([$userId]);
            echo json_encode(['success' => true]);
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
