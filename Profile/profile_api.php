<?php
require_once __DIR__ . '/../database/api_bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'];
$userId = current_user_id();

if (!$userId) api_error('Not logged in.', 401);

try {

    // ── GET: return profile data ────────────────────────────
    if ($method === 'GET') {
        $stmt = $pdo->prepare("
            SELECT u.user_id, u.first_name, u.middle_name, u.last_name, u.email, u.username, u.role,
                   c.phone_num, c.address
            FROM users u
            LEFT JOIN customers c ON c.user_id = u.user_id
            WHERE u.user_id = ?
        ");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if (!$user) {
            echo json_encode(['success' => false, 'error' => 'User not found.']);
            exit;
        }

        echo json_encode(['success' => true, 'profile' => $user]);
        exit;
    }

    // ── POST: update profile ────────────────────────────────
    if ($method === 'POST') {
        $body = json_body();
        $action = $body['action'] ?? '';

        // Update basic info
        if ($action === 'update_info') {
            $firstName = trim($body['first_name'] ?? '');
            $lastName = trim($body['last_name'] ?? '');
            $email = trim($body['email'] ?? '');
            $phone = trim($body['phone'] ?? '');

            if (!$firstName || !$lastName || !$email) {
                echo json_encode(['success' => false, 'error' => 'First name, last name, and email are required.']);
                exit;
            }

            // Check email uniqueness (excluding self)
            $stmt = $pdo->prepare("SELECT user_id FROM users WHERE email = ? AND user_id != ?");
            $stmt->execute([$email, $userId]);
            if ($stmt->fetch()) {
                echo json_encode(['success' => false, 'error' => 'Email already in use by another account.']);
                exit;
            }

            // Update users table
            $stmt = $pdo->prepare("UPDATE users SET first_name = ?, last_name = ?, email = ? WHERE user_id = ?");
            $stmt->execute([$firstName, $lastName, $email, $userId]);

            // Update or create customer record for phone
            if ($phone) {
                $stmt = $pdo->prepare("SELECT customer_id FROM customers WHERE user_id = ?");
                $stmt->execute([$userId]);
                if ($stmt->fetch()) {
                    $stmt = $pdo->prepare("UPDATE customers SET phone_num = ? WHERE user_id = ?");
                    $stmt->execute([$phone, $userId]);
                } else {
                    $stmt = $pdo->prepare("INSERT INTO customers (user_id, phone_num, address) VALUES (?, ?, '')");
                    $stmt->execute([$userId, $phone]);
                }
            }

            echo json_encode(['success' => true, 'message' => 'Profile updated.']);
            exit;
        }

        // Change password
        if ($action === 'change_password') {
            $currentPassword = $body['current_password'] ?? '';
            $newPassword = $body['new_password'] ?? '';

            if (!$currentPassword || !$newPassword) {
                echo json_encode(['success' => false, 'error' => 'All password fields are required.']);
                exit;
            }

            if (strlen($newPassword) < 8) {
                echo json_encode(['success' => false, 'error' => 'New password must be at least 8 characters.']);
                exit;
            }

            // Verify current password
            $stmt = $pdo->prepare("SELECT password_hash FROM users WHERE user_id = ?");
            $stmt->execute([$userId]);
            $hash = $stmt->fetchColumn();

            if (!password_verify($currentPassword, $hash)) {
                echo json_encode(['success' => false, 'error' => 'Current password is incorrect.']);
                exit;
            }

            // Update password
            $newHash = password_hash($newPassword, PASSWORD_BCRYPT);
            $stmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE user_id = ?");
            $stmt->execute([$newHash, $userId]);

            echo json_encode(['success' => true, 'message' => 'Password changed successfully.']);
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
