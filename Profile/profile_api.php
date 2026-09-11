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
                   u.profile_image_path,
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

        $user['profile_photo_url'] = $user['profile_image_path'] ? 'profile_photo.php?v=' . rawurlencode((string)time()) : null;
        unset($user['profile_image_path']);
        echo json_encode(['success' => true, 'profile' => $user]);
        exit;
    }

    // ── POST: update profile ────────────────────────────────
    if ($method === 'POST') {
        $contentType = strtolower($_SERVER['CONTENT_TYPE'] ?? '');
        $body = str_contains($contentType, 'multipart/form-data') ? $_POST : json_body();
        $action = $body['action'] ?? '';

        if ($action === 'upload_photo') {
            if (!isset($_FILES['photo'])) api_error('Select a profile photo.', 422);
            $photoPath = store_image_upload($_FILES['photo'], 'profiles');

            $stmt = $pdo->prepare("SELECT profile_image_path FROM users WHERE user_id=?");
            $stmt->execute([$userId]);
            $oldPath = $stmt->fetchColumn();
            $pdo->prepare("UPDATE users SET profile_image_path=? WHERE user_id=?")->execute([$photoPath, $userId]);

            // Remove the replaced private image only after the DB update succeeds.
            if ($oldPath && $oldPath !== $photoPath) {
                $storageRoot = realpath(dirname(__DIR__) . '/OrderProcess/private_uploads');
                $oldFile = realpath(dirname(__DIR__) . '/' . ltrim((string)$oldPath, '/'));
                if ($storageRoot && $oldFile && str_starts_with($oldFile, $storageRoot . DIRECTORY_SEPARATOR) && is_file($oldFile)) {
                    @unlink($oldFile);
                }
            }

            audit_event($pdo, 'profile.photo_updated', null);
            echo json_encode(['success'=>true, 'message'=>'Profile photo updated.', 'photo_url'=>'profile_photo.php?v=' . time()]);
            exit;
        }

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
