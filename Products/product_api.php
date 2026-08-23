<?php
require_once __DIR__ . '/../database/api_bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'];

try {

    // ── GET: list all products ──────────────────────────────
    if ($method === 'GET') {
        $view = $_GET['view'] ?? 'admin';

        // Public view: only front_page_visible products
        if ($view === 'public') {
            $stmt = $pdo->query("
                SELECT product_id AS id, name, description, material_used, type_of_product, price, image_path, front_page_visible
                FROM products
                WHERE is_archived = 0 AND is_active = 1 AND front_page_visible = 1
                ORDER BY updated_at DESC
            ");
            $products = $stmt->fetchAll();
            echo json_encode(['success' => true, 'products' => $products]);
            exit;
        }

        // Best sellers: products with most orders, fallback to front_page_visible
        if ($view === 'bestsellers') {
            $stmt = $pdo->query("
                SELECT p.product_id AS id, p.name, p.type_of_product, p.price, p.image_path,
                       COALESCE(SUM(od.quantity), 0) AS total_sold
                FROM products p
                LEFT JOIN order_details od ON od.product_id = p.product_id
                WHERE p.is_archived = 0 AND p.is_active = 1 AND p.front_page_visible = 1
                GROUP BY p.product_id
                ORDER BY total_sold DESC, p.updated_at DESC
                LIMIT 10
            ");
            $products = $stmt->fetchAll();
            echo json_encode(['success' => true, 'products' => $products]);
            exit;
        }

        // Portfolio view: all front-page products grouped by type_of_product
        if ($view === 'portfolio') {
            $stmt = $pdo->query("
                SELECT product_id AS id, name, type_of_product, price, image_path
                FROM products
                WHERE is_archived = 0 AND is_active = 1 AND front_page_visible = 1
                ORDER BY type_of_product, name
            ");
            $rows = $stmt->fetchAll();

            // Group by type
            $grouped = [];
            foreach ($rows as $row) {
                $type = $row['type_of_product'] ?: 'Other';
                $grouped[$type][] = $row;
            }

            echo json_encode(['success' => true, 'products' => $grouped]);
            exit;
        }

        require_role(['admin', 'owner']);
        // Admin view: all active products
        $stmt = $pdo->query("
            SELECT product_id AS id, name, description, material_used, type_of_product, price, image_path, front_page_visible, is_archived, is_active
            FROM products
            WHERE is_archived = 0 AND is_active = 1
            ORDER BY updated_at DESC
        ");
        $products = $stmt->fetchAll();

        $bomRows = $pdo->query("SELECT pm.product_id, pm.inventory_id, pm.quantity_required, i.item_name, i.unit_of_measure FROM product_materials pm JOIN inventory i ON i.inventory_id=pm.inventory_id ORDER BY i.item_name")->fetchAll();
        $bomByProduct = [];
        foreach ($bomRows as $row) $bomByProduct[(int)$row['product_id']][] = $row;
        foreach ($products as &$product) $product['bom'] = $bomByProduct[(int)$product['id']] ?? [];
        unset($product);
        $inventoryOptions = $pdo->query("SELECT inventory_id, item_name, unit_of_measure, stock FROM inventory WHERE is_active=1 ORDER BY item_name")->fetchAll();

        $totalProducts = (int) $pdo->query("SELECT COUNT(*) FROM products WHERE is_archived = 0 AND is_active = 1")->fetchColumn();

        // Top category
        $topCategory = $pdo->query("
            SELECT type_of_product, COUNT(*) AS cnt FROM products
            WHERE is_archived = 0 AND is_active = 1 AND type_of_product IS NOT NULL
            GROUP BY type_of_product ORDER BY cnt DESC LIMIT 1
        ")->fetchColumn();

        echo json_encode([
            'success' => true,
            'products' => $products,
            'inventory_options' => $inventoryOptions,
            'stats' => [
                'total' => $totalProducts,
                'top_category' => $topCategory ?: '—'
            ]
        ]);
        exit;
    }

    // ── POST: add / update / archive product ────────────────
    if ($method === 'POST') {
        require_role(['admin', 'owner']);
        $action = $_POST['action'] ?? '';

        if ($action === 'get_bom') {
            $id = (int)($_POST['id'] ?? 0);
            $stmt = $pdo->prepare("SELECT pm.inventory_id, pm.quantity_required, i.item_name, i.unit_of_measure, i.stock FROM product_materials pm JOIN inventory i ON i.inventory_id=pm.inventory_id WHERE pm.product_id=? ORDER BY i.item_name");
            $stmt->execute([$id]);
            echo json_encode(['success'=>true, 'materials'=>$stmt->fetchAll()]);
            exit;
        }

        if ($action === 'save_bom') {
            $id = (int)($_POST['id'] ?? 0);
            $materials = json_decode($_POST['materials'] ?? '[]', true);
            if (!$id || !is_array($materials) || !$materials) api_error('Every product must have at least one inventory material.', 422);
            $pdo->beginTransaction();
            try {
                $check = $pdo->prepare("SELECT inventory_id FROM inventory WHERE inventory_id=? AND is_active=1");
                $pdo->prepare("DELETE FROM product_materials WHERE product_id=?")->execute([$id]);
                $insert = $pdo->prepare("INSERT INTO product_materials (product_id, inventory_id, quantity_required) VALUES (?,?,?)");
                $seen = [];
                foreach ($materials as $material) {
                    $inventoryId = (int)($material['inventory_id'] ?? 0);
                    $quantity = (float)($material['quantity_required'] ?? 0);
                    if (!$inventoryId || $quantity <= 0 || isset($seen[$inventoryId])) throw new RuntimeException('Invalid or duplicate BOM material.');
                    $check->execute([$inventoryId]);
                    if (!$check->fetchColumn()) throw new RuntimeException('A selected inventory material is unavailable.');
                    $insert->execute([$id, $inventoryId, $quantity]);
                    $seen[$inventoryId] = true;
                }
                audit_event($pdo, 'product.bom_updated', null, ['product_id'=>$id, 'materials'=>$materials]);
                $pdo->commit();
                echo json_encode(['success'=>true, 'message'=>'Product materials saved.']);
            } catch (Throwable $e) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                api_error($e->getMessage(), 422);
            }
            exit;
        }

        if ($action === 'add') {
            $name = trim($_POST['name'] ?? '');
            $material = trim($_POST['material_used'] ?? '');
            $type = trim($_POST['type_of_product'] ?? '');
            $price = (float)($_POST['price'] ?? 0);
            $userId = $_SESSION['user_id'] ?? null;

            if (!$name || !$price) {
                echo json_encode(['success' => false, 'error' => 'Name and price are required.']);
                exit;
            }

            // Handle image upload
            $imagePath = null;
            if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                $ext = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
                $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
                $mime = (new finfo(FILEINFO_MIME_TYPE))->file($_FILES['image']['tmp_name']);
                $allowedMime = ['image/jpeg','image/png','image/gif','image/webp'];
                if ($_FILES['image']['size'] > 5*1024*1024 || !in_array(strtolower($ext), $allowed, true) || !in_array($mime,$allowedMime,true) || @getimagesize($_FILES['image']['tmp_name']) === false) {
                    echo json_encode(['success' => false, 'error' => 'Invalid image format.']);
                    exit;
                }
                $filename = 'product_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
                $dest = __DIR__ . '/uploads/' . $filename;
                move_uploaded_file($_FILES['image']['tmp_name'], $dest);
                $imagePath = 'uploads/' . $filename;
            }

            $stmt = $pdo->prepare("
                INSERT INTO products (name, material_used, type_of_product, price, image_path, created_by)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$name, $material ?: null, $type ?: null, $price, $imagePath, $userId]);
            $productId = (int)$pdo->lastInsertId();
            audit_event($pdo, 'product.created', null, ['product_id'=>$productId]);

            echo json_encode(['success' => true, 'message' => 'Product added.', 'id' => $productId]);
            exit;
        }

        if ($action === 'update') {
            $id = (int)($_POST['id'] ?? 0);
            $name = trim($_POST['name'] ?? '');
            $material = trim($_POST['material_used'] ?? '');
            $type = trim($_POST['type_of_product'] ?? '');
            $price = (float)($_POST['price'] ?? 0);
            $frontPage = isset($_POST['front_page_visible']) ? 1 : 0;

            if (!$id || !$name) {
                echo json_encode(['success' => false, 'error' => 'ID and name are required.']);
                exit;
            }

            // Handle image upload (optional on update)
            if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
                $ext = pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION);
                $allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
                $mime = (new finfo(FILEINFO_MIME_TYPE))->file($_FILES['image']['tmp_name']);
                $allowedMime = ['image/jpeg','image/png','image/gif','image/webp'];
                if ($_FILES['image']['size'] <= 5*1024*1024 && in_array(strtolower($ext), $allowed, true) && in_array($mime,$allowedMime,true) && @getimagesize($_FILES['image']['tmp_name']) !== false) {
                    $filename = 'product_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
                    $dest = __DIR__ . '/uploads/' . $filename;
                    move_uploaded_file($_FILES['image']['tmp_name'], $dest);
                    $imagePath = 'uploads/' . $filename;

                    $stmt = $pdo->prepare("UPDATE products SET name=?, material_used=?, type_of_product=?, price=?, image_path=?, front_page_visible=? WHERE product_id=?");
                    $stmt->execute([$name, $material ?: null, $type ?: null, $price, $imagePath, $frontPage, $id]);
                    echo json_encode(['success' => true, 'message' => 'Product updated.']);
                    exit;
                }
            }

            $stmt = $pdo->prepare("UPDATE products SET name=?, material_used=?, type_of_product=?, price=?, front_page_visible=? WHERE product_id=?");
            $stmt->execute([$name, $material ?: null, $type ?: null, $price, $frontPage, $id]);
            echo json_encode(['success' => true, 'message' => 'Product updated.']);
            exit;
        }

        if ($action === 'archive') {
            $id = (int)($_POST['id'] ?? 0);
            if (!$id) { echo json_encode(['success' => false, 'error' => 'ID required.']); exit; }
            $stmt = $pdo->prepare("UPDATE products SET is_archived = 1 WHERE product_id = ?");
            $stmt->execute([$id]);
            audit_event($pdo, 'product.archived', null, ['product_id'=>$id]);
            echo json_encode(['success' => true, 'message' => 'Product archived.']);
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
    echo json_encode(['success' => false, 'error' => 'Unable to process the product request.']);
}
