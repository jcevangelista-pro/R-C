<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../database/connection.php';

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

        // Admin view: all active products
        $stmt = $pdo->query("
            SELECT product_id AS id, name, description, material_used, type_of_product, price, image_path, front_page_visible, is_archived, is_active
            FROM products
            WHERE is_archived = 0 AND is_active = 1
            ORDER BY updated_at DESC
        ");
        $products = $stmt->fetchAll();

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
            'stats' => [
                'total' => $totalProducts,
                'top_category' => $topCategory ?: '—'
            ]
        ]);
        exit;
    }

    // ── POST: add / update / archive product ────────────────
    if ($method === 'POST') {
        $action = $_POST['action'] ?? '';

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
                if (!in_array(strtolower($ext), $allowed)) {
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

            echo json_encode(['success' => true, 'message' => 'Product added.', 'id' => (int)$pdo->lastInsertId()]);
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
                if (in_array(strtolower($ext), $allowed)) {
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
            echo json_encode(['success' => true, 'message' => 'Product archived.']);
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
