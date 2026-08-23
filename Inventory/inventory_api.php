<?php
require_once __DIR__ . '/../database/api_bootstrap.php';
require_role(['admin', 'owner']);

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
            $item['stock'] = (float)$item['stock'];
            $item['reorder_level'] = (float)$item['reorder_level'];
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

    $body = json_body();

    // ── POST: update stock (add/deduct) ─────────────────────
    if ($method === 'POST') {
        $action = $body['action'] ?? '';

        if ($action === 'update_stock') {
            $id = (int)($body['id'] ?? 0);
            $mode = $body['mode'] ?? 'add'; // 'add' or 'deduct'
            $qty = round((float)($body['quantity'] ?? 0), 2);
            $remarks = trim($body['remarks'] ?? '');
            $userId = $_SESSION['user_id'] ?? null;

            if (!$id || $qty <= 0) {
                echo json_encode(['success' => false, 'error' => 'Invalid item or quantity.']);
                exit;
            }

            $pdo->beginTransaction();
            // Lock current stock so simultaneous changes cannot overwrite one another.
            $stmt = $pdo->prepare("SELECT stock FROM inventory WHERE inventory_id = ? AND is_active=1 FOR UPDATE");
            $stmt->execute([$id]);
            $currentValue = $stmt->fetchColumn();
            if ($currentValue === false) { $pdo->rollBack(); api_error('Inventory item not found or archived.', 404); }
            $current = (float)$currentValue;

            if ($mode === 'deduct' && $qty > $current) api_error('Insufficient stock for this deduction.', 409);
            $newStock = $mode === 'add' ? $current + $qty : $current - $qty;
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

            audit_event($pdo, 'inventory.stock_updated', null, ['inventory_id'=>$id,'action'=>$dbAction,'quantity'=>$qty]);
            $pdo->commit();

            echo json_encode(['success' => true, 'message' => 'Stock updated.', 'new_stock' => $newStock]);
            exit;
        }

        if ($action === 'add_material') {
            $itemName = trim($body['item_name'] ?? '');
            $category = $body['category'] ?? 'OTHER';
            $stock = round((float)($body['stock'] ?? 0), 2);
            $unit = trim($body['unit'] ?? '');
            $reorderLevel = round((float)($body['reorder_level'] ?? 10), 2);
            $unitCost = (float)($body['unit_cost'] ?? 0);
            $description = trim($body['description'] ?? '');
            $userId = $_SESSION['user_id'] ?? null;

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
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    error_log($e->__toString());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Unable to process the inventory request.']);
}
