<?php
// ============================================================
// User Management Actions API
// Handles: GET (list), POST (create), PUT (update), DELETE
// Table: user (admin/owner accounts)
// ============================================================

require_once __DIR__ . '/../database/api_bootstrap.php';
require_role(['owner']);

$method = $_SERVER['REQUEST_METHOD'];

try {
    // ── GET: list all admin/owner accounts ──────────────────
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT user_id AS id, username, email, first_name, last_name, role, is_active FROM users WHERE role IN ('admin', 'owner') ORDER BY is_active DESC, role, username");
        $rows = $stmt->fetchAll();
        echo json_encode(['success' => true, 'users' => $rows]);
        exit;
    }

    $body = json_body();

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
        if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/', $password)) api_error('Password must contain uppercase, lowercase, number, and special character.', 422);

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
        $emailLocal = preg_replace('/[^a-z0-9._-]/', '', strtolower($username)) ?: 'account';
        $email = $emailLocal . '+' . bin2hex(random_bytes(3)) . '@rcprinting.local';
        $stmt = $pdo->prepare("INSERT INTO users (first_name, last_name, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$username, $role, $email, $username, $hash, $role]);
        $newId = $pdo->lastInsertId();
        audit_event($pdo, 'user.created', null, ['target_user_id'=>(int)$newId,'role'=>$role]);

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
            if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/', $password)) api_error('Password must contain uppercase, lowercase, number, and special character.', 422);
            $hash = password_hash($password, PASSWORD_BCRYPT);
            $stmt = $pdo->prepare("UPDATE users SET username = ?, password_hash = ?, role = ? WHERE user_id = ?");
            $stmt->execute([$username, $hash, $role, $id]);
        } else {
            $stmt = $pdo->prepare("UPDATE users SET username = ?, role = ? WHERE user_id = ?");
            $stmt->execute([$username, $role, $id]);
        }

        audit_event($pdo, 'user.updated', null, ['target_user_id'=>$id,'role'=>$role,'password_changed'=>(bool)$password]);

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

        if ($id === current_user_id()) api_error('You cannot deactivate your own account.', 409);
        $stmt = $pdo->prepare("SELECT role FROM users WHERE user_id=?");
        $stmt->execute([$id]);
        if ($stmt->fetchColumn() === 'owner') {
            $owners = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='owner' AND is_active=1")->fetchColumn();
            if ($owners <= 1) api_error('The last active owner cannot be deactivated.', 409);
        }
        $stmt = $pdo->prepare("UPDATE users SET is_active = 0 WHERE user_id = ?");
        $stmt->execute([$id]);

        audit_event($pdo, 'user.deactivated', null, ['target_user_id'=>$id]);
        echo json_encode(['success' => true, 'message' => 'Account deactivated.']);
        exit;
    }

    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed.']);

} catch (Exception $e) {
    error_log($e->__toString());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Unable to process the user request.']);
}
