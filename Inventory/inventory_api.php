<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../database/connection.php';

$method = $_SERVER['REQUEST_METHOD'];

try {

    // ── GET: list inventory items ───────────────────────────
    if ($method === 'GET') {
        $type = $_GET['type'] ?? 'active';

        if ($type === 'archived') {
            $stmt = $pdo->query("
                SELECT inventory_id AS id, item_name, category, stock, unit_of_measure AS unit, reorder_level, unit_cost, is_active, updated_at
                FROM inventory WHERE is_active = 0 ORDER BY updated_at DESC
            ");
        } else {
            $stmt = $pdo->query("
                SELECT inventory_id AS id, item_name, category, stock, unit_of_measure AS unit, reorder_level, unit_cost, is_active
                FROM inventory WHERE is_active = 1 ORDER BY item_name
            ");
        }
        $items = $stmt->fetchAll();

        // Add computed status
        foreach ($items as &$item) {
            $item['stock'] = (int)$item['stock'];
            $item['reorder_level'] = (int)$item['reorder_level'];
            if ($item['stock'] === 0) {
                $item['status'] = 'Out of Stock';
            } elseif ($item['stock'] <= $item['reorder_level']) {
                $item['status'] = 'Low Stock';
            } elseif ($item['stock'] > $item['reorder_level'] * 5) {
                $item['status'] = 'High Stock';
            } else {
                $item['status'] = 'Normal Stock';
            }
        }
        unset($item);

        // Get update history
        $history = $pdo->query("
            SELECT 
                ih.history_id, i.item_name, ih.action, ih.quantity, ih.stock_before, ih.stock_after,
                ih.reason, ih.notes,
                CONCAT(u.first_name, ' ', u.last_name) AS updated_by_name,
                DATE_FORMAT(ih.created_at, '%b %d, %Y') AS date_formatted,
                DATE_FORMAT(ih.created_at, '%h:%i %p') AS time_formatted
            FROM inventory_history ih
            JOIN inventory i ON i.inventory_id = ih.inventory_id
            LEFT JOIN users u ON u.user_id = ih.updated_by
            ORDER BY ih.created_at DESC
            LIMIT 50
        ")->fetchAll();

        echo json_encode(['success' => true, 'items' => $items, 'history' => $history]);
        exit;
    }

    $body = json_decode(file_get_contents('php://input'), true);

    // ── POST: update stock (add/deduct) ─────────────────────
    if ($method === 'POST') {
        $action = $body['action'] ?? '';

        if ($action === 'update_stock') {
            $id = (int)($body['id'] ?? 0);
            $mode = $body['mode'] ?? 'add'; // 'add' or 'deduct'
            $qty = (int)($body['quantity'] ?? 0);
            $remarks = trim($body['remarks'] ?? '');
            $userId = $_SESSION['user_id'] ?? null;

            if (!$id || $qty <= 0) {
                echo json_encode(['success' => false, 'error' => 'Invalid item or quantity.']);
                exit;
            }

            // Get current stock
            $stmt = $pdo->prepare("SELECT stock FROM inventory WHERE inventory_id = ?");
            $stmt->execute([$id]);
            $current = (int)$stmt->fetchColumn();

            $newStock = $mode === 'add' ? $current + $qty : max(0, $current - $qty);
            $dbAction = $mode === 'add' ? 'Added' : 'Deducted';

            // Update stock
            $stmt = $pdo->prepare("UPDATE inventory SET stock = ? WHERE inventory_id = ?");
            $stmt->execute([$newStock, $id]);

            // Record history
            $stmt = $pdo->prepare("
                INSERT INTO inventory_history (inventory_id, action, quantity, stock_before, stock_after, reason, updated_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$id, $dbAction, $qty, $current, $newStock, $remarks, $userId]);

            echo json_encode(['success' => true, 'message' => 'Stock updated.', 'new_stock' => $newStock]);
            exit;
        }

        if ($action === 'add_material') {
            $itemName = trim($body['item_name'] ?? '');
            $category = $body['category'] ?? 'OTHER';
            $stock = (int)($body['stock'] ?? 0);
            $unit = trim($body['unit'] ?? '');
            $reorderLevel = (int)($body['reorder_level'] ?? 10);
            $unitCost = (float)($body['unit_cost'] ?? 0);
            $description = trim($body['description'] ?? '');
            $userId = $_SESSION['user_id'] ?? null;

            // Only owners can add materials
            if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'owner') {
                http_response_code(403);
                echo json_encode(['success' => false, 'error' => 'Only owners can add materials.']);
                exit;
            }

            if (!$itemName || !$unit) {
                echo json_encode(['success' => false, 'error' => 'Item name and unit are required.']);
                exit;
            }

            $validCategories = ['MUGS','SHIRTS','PAPER','SUPPLY','PEN','FANS','OTHER'];
            if (!in_array($category, $validCategories)) $category = 'OTHER';

            $stmt = $pdo->prepare("
                INSERT INTO inventory (item_name, description, category, unit_of_measure, stock, reorder_level, unit_cost, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$itemName, $description ?: null, $category, $unit, $stock, $reorderLevel, $unitCost, $userId]);

            echo json_encode(['success' => true, 'message' => 'Material added.', 'id' => (int)$pdo->lastInsertId()]);
            exit;
        }

        if ($action === 'archive') {
            $id = (int)($body['id'] ?? 0);
            if (!$id) { echo json_encode(['success' => false, 'error' => 'Invalid item.']); exit; }

            $stmt = $pdo->prepare("UPDATE inventory SET is_active = 0 WHERE inventory_id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'Item archived.']);
            exit;
        }

        if ($action === 'unarchive') {
            $id = (int)($body['id'] ?? 0);
            if (!$id) { echo json_encode(['success' => false, 'error' => 'Invalid item.']); exit; }

            $stmt = $pdo->prepare("UPDATE inventory SET is_active = 1 WHERE inventory_id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'Item unarchived.']);
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
