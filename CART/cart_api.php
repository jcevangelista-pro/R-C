<?php
session_start();
header('Content-Type: application/json');
require_once __DIR__ . '/../database/connection.php';

$method = $_SERVER['REQUEST_METHOD'];

// Get customer_id from session
$userId = $_SESSION['user_id'] ?? null;
$customerId = null;

if ($userId) {
    $stmt = $pdo->prepare("SELECT customer_id FROM customers WHERE user_id = ?");
    $stmt->execute([$userId]);
    $customerId = $stmt->fetchColumn();

    // Auto-create customer record if user is a customer role but has no entry yet
    if (!$customerId && isset($_SESSION['role']) && $_SESSION['role'] === 'customer') {
        $stmt = $pdo->prepare("INSERT INTO customers (user_id, phone_num, address) VALUES (?, '', '')");
        $stmt->execute([$userId]);
        $customerId = $pdo->lastInsertId();
    }
}

try {

    // ── GET: list cart items for logged-in customer ──────────
    if ($method === 'GET') {
        if (!$customerId) {
            echo json_encode(['success' => true, 'items' => []]);
            exit;
        }

        $stmt = $pdo->prepare("
            SELECT c.cart_id, c.product_id, c.quantity,
                   p.name, p.type_of_product AS category, p.price, p.image_path
            FROM cart c
            JOIN products p ON p.product_id = c.product_id
            WHERE c.customer_id = ?
            ORDER BY c.added_at DESC
        ");
        $stmt->execute([$customerId]);
        $items = $stmt->fetchAll();

        foreach ($items as &$item) {
            $item['quantity'] = (int)$item['quantity'];
            $item['price'] = (float)$item['price'];
        }
        unset($item);

        echo json_encode(['success' => true, 'items' => $items]);
        exit;
    }

    // ── POST: cart actions ───────────────────────────────────
    if ($method === 'POST') {
        $body = json_decode(file_get_contents('php://input'), true);
        $action = $body['action'] ?? '';

        if (!$customerId) {
            echo json_encode(['success' => false, 'error' => 'You must be logged in as a customer to use the cart.']);
            exit;
        }

        // Add to cart
        if ($action === 'add') {
            $productId = (int)($body['product_id'] ?? 0);
            $quantity = (int)($body['quantity'] ?? 1);

            if (!$productId || $quantity < 1) {
                echo json_encode(['success' => false, 'error' => 'Invalid product or quantity.']);
                exit;
            }

            // Check if product already in cart
            $stmt = $pdo->prepare("SELECT cart_id, quantity FROM cart WHERE customer_id = ? AND product_id = ?");
            $stmt->execute([$customerId, $productId]);
            $existing = $stmt->fetch();

            if ($existing) {
                // Update quantity
                $newQty = $existing['quantity'] + $quantity;
                $stmt = $pdo->prepare("UPDATE cart SET quantity = ? WHERE cart_id = ?");
                $stmt->execute([$newQty, $existing['cart_id']]);
            } else {
                // Insert new
                $stmt = $pdo->prepare("INSERT INTO cart (customer_id, product_id, quantity) VALUES (?, ?, ?)");
                $stmt->execute([$customerId, $productId, $quantity]);
            }

            echo json_encode(['success' => true, 'message' => 'Added to cart.']);
            exit;
        }

        // Update quantity
        if ($action === 'update_qty') {
            $cartId = (int)($body['cart_id'] ?? 0);
            $quantity = (int)($body['quantity'] ?? 1);

            if (!$cartId) {
                echo json_encode(['success' => false, 'error' => 'Cart item ID required.']);
                exit;
            }

            if ($quantity < 1) {
                // Remove if quantity is 0
                $stmt = $pdo->prepare("DELETE FROM cart WHERE cart_id = ? AND customer_id = ?");
                $stmt->execute([$cartId, $customerId]);
            } else {
                $stmt = $pdo->prepare("UPDATE cart SET quantity = ? WHERE cart_id = ? AND customer_id = ?");
                $stmt->execute([$quantity, $cartId, $customerId]);
            }

            echo json_encode(['success' => true, 'message' => 'Cart updated.']);
            exit;
        }

        // Remove from cart
        if ($action === 'remove') {
            $cartId = (int)($body['cart_id'] ?? 0);
            if (!$cartId) {
                echo json_encode(['success' => false, 'error' => 'Cart item ID required.']);
                exit;
            }

            $stmt = $pdo->prepare("DELETE FROM cart WHERE cart_id = ? AND customer_id = ?");
            $stmt->execute([$cartId, $customerId]);
            echo json_encode(['success' => true, 'message' => 'Item removed.']);
            exit;
        }

        // Save delivery details to database
        if ($action === 'save_delivery') {
            $phone = trim($body['phone_num'] ?? '');
            $address = trim($body['address'] ?? '');

            if ($phone || $address) {
                $stmt = $pdo->prepare("UPDATE customers SET phone_num = ?, address = ? WHERE customer_id = ?");
                $stmt->execute([$phone, $address, $customerId]);
            }

            // Also update email on the users table if provided
            $email = trim($body['email'] ?? '');
            if ($email && $userId) {
                $stmt = $pdo->prepare("UPDATE users SET email = ? WHERE user_id = ?");
                $stmt->execute([$email, $userId]);
            }

            echo json_encode(['success' => true, 'message' => 'Delivery details saved.']);
            exit;
        }

        // Get saved delivery info
        if ($action === 'get_delivery') {
            $stmt = $pdo->prepare("
                SELECT u.first_name, u.middle_name, u.last_name, u.email, c.phone_num, c.address
                FROM customers c
                JOIN users u ON u.user_id = c.user_id
                WHERE c.customer_id = ?
            ");
            $stmt->execute([$customerId]);
            $info = $stmt->fetch();
            echo json_encode(['success' => true, 'delivery' => $info ?: null]);
            exit;
        }

        // Clear cart (after checkout)
        if ($action === 'clear') {
            $stmt = $pdo->prepare("DELETE FROM cart WHERE customer_id = ?");
            $stmt->execute([$customerId]);
            echo json_encode(['success' => true, 'message' => 'Cart cleared.']);
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
