<?php
// ============================================================
// User Management Actions API
// Handles: GET (list), POST (create), PUT (update), DELETE
// Table: user (admin/owner accounts)
// ============================================================

header('Content-Type: application/json');
require_once __DIR__ . '/../database/connection.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
    // ── GET: list all admin/owner accounts ──────────────────
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT user_id AS id, username, password_hash AS password, role FROM users WHERE role IN ('admin', 'owner') ORDER BY role, username");
        $rows = $stmt->fetchAll();
        echo json_encode(['success' => true, 'users' => $rows]);
        exit;
    }

    $body = json_decode(file_get_contents('php://input'), true);

    // ── POST: create new account ────────────────────────────
    if ($method === 'POST') {
        $username = trim($body['username'] ?? '');
        $password = trim($body['password'] ?? '');
        $role     = strtolower(trim($body['role'] ?? 'admin'));

        if (!$username || !$password) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Username and password are required.']);
            exit;
        }

        if (!in_array($role, ['admin', 'owner'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Role must be admin or owner.']);
            exit;
        }

        // Check duplicate username
        $check = $pdo->prepare("SELECT user_id FROM users WHERE username = ?");
        $check->execute([$username]);
        if ($check->fetch()) {
            http_response_code(409);
            echo json_encode(['success' => false, 'error' => 'Username already exists.']);
            exit;
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $email = strtolower(str_replace(' ', '', $username)) . '@rcprinting.local';
        $stmt = $pdo->prepare("INSERT INTO users (first_name, last_name, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$username, $role, $email, $username, $hash, $role]);
        $newId = $pdo->lastInsertId();

        echo json_encode(['success' => true, 'id' => $newId, 'message' => 'Account created.']);
        exit;
    }

    // ── PUT: update username / password / role ──────────────
    if ($method === 'PUT') {
        $id       = (int)($body['id'] ?? 0);
        $username = trim($body['username'] ?? '');
        $password = trim($body['password'] ?? '');
        $role     = strtolower(trim($body['role'] ?? ''));

        if (!$id || !$username || !$role) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'ID, username and role are required.']);
            exit;
        }

        if (!in_array($role, ['admin', 'owner'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Role must be admin or owner.']);
            exit;
        }

        // Check duplicate username (excluding self)
        $check = $pdo->prepare("SELECT user_id FROM users WHERE username = ? AND user_id != ?");
        $check->execute([$username, $id]);
        if ($check->fetch()) {
            http_response_code(409);
            echo json_encode(['success' => false, 'error' => 'Username already taken.']);
            exit;
        }

        if ($password) {
            $hash = password_hash($password, PASSWORD_BCRYPT);
            $stmt = $pdo->prepare("UPDATE users SET username = ?, password_hash = ?, role = ? WHERE user_id = ?");
            $stmt->execute([$username, $hash, $role, $id]);
        } else {
            $stmt = $pdo->prepare("UPDATE users SET username = ?, role = ? WHERE user_id = ?");
            $stmt->execute([$username, $role, $id]);
        }

        echo json_encode(['success' => true, 'message' => 'Account updated.']);
        exit;
    }

    // ── DELETE ───────────────────────────────────────────────
    if ($method === 'DELETE') {
        $id = (int)($body['id'] ?? 0);
        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'ID is required.']);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM users WHERE user_id = ?");
        $stmt->execute([$id]);

        echo json_encode(['success' => true, 'message' => 'Account deleted.']);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed.']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
