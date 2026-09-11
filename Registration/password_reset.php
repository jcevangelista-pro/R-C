<?php
declare(strict_types=1);
require_once __DIR__ . '/../database/api_bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') api_error('Method not allowed.', 405);
$body = json_body();
$action = $body['action'] ?? '';

if ($action === 'request') {
    $email = strtolower(trim((string)($body['email'] ?? '')));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) api_error('Enter a valid email address.', 422);

    $now = time();
    $attempts = array_values(array_filter($_SESSION['reset_requests'] ?? [], fn($time) => $time > $now - 900));
    if (count($attempts) >= 3) api_error('Too many reset requests. Try again in 15 minutes.', 429);
    $attempts[] = $now;
    $_SESSION['reset_requests'] = $attempts;

    $stmt = $pdo->prepare("SELECT user_id, first_name, email FROM users WHERE LOWER(email)=? AND is_active=1 LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user) {
        $token = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $token);
        $pdo->beginTransaction();
        $pdo->prepare("UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=? AND used_at IS NULL")->execute([$user['user_id']]);
        $pdo->prepare("INSERT INTO password_reset_tokens (user_id,selector_hash,expires_at) VALUES (?,?,DATE_ADD(NOW(), INTERVAL 1 HOUR))")
            ->execute([$user['user_id'], $tokenHash]);
        $pdo->commit();

        $host = (string)($_SERVER['HTTP_HOST'] ?? 'localhost');
        if (!preg_match('/^[A-Za-z0-9.-]+(?::\d+)?$/', $host)) $host = 'localhost';
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $directory = rtrim(str_replace('\\', '/', dirname((string)($_SERVER['SCRIPT_NAME'] ?? '/Registration/password_reset.php'))), '/');
        $resetUrl = $scheme . '://' . $host . $directory . '/ResetPassword.html?token=' . rawurlencode($token);
        $subject = 'Reset your R&C Printing Services password';
        $message = "Hello {$user['first_name']},\n\nUse this link to reset your password:\n{$resetUrl}\n\nThis link expires in one hour and can be used only once. If you did not request this, ignore this email.";
        $headers = "From: R&C Printing Services <no-reply@localhost>\r\nContent-Type: text/plain; charset=UTF-8";
        if (!mail((string)$user['email'], $subject, $message, $headers)) {
            $pdo->prepare("UPDATE password_reset_tokens SET used_at=NOW() WHERE selector_hash=?")->execute([$tokenHash]);
            error_log('Password reset email delivery failed for user ' . $user['user_id']);
        }
    }

    api_response(['success'=>true, 'message'=>'If an active account uses that email, a reset link has been sent.']);
}

if ($action === 'reset') {
    $token = trim((string)($body['token'] ?? ''));
    $password = (string)($body['password'] ?? '');
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) api_error('This reset link is invalid or expired.', 422);
    if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,30}$/', $password)) {
        api_error('Password must be 8–30 characters and contain uppercase, lowercase, number, and special character.', 422);
    }

    $tokenHash = hash('sha256', $token);
    $pdo->beginTransaction();
    $stmt = $pdo->prepare("SELECT pr.reset_id,pr.user_id,u.is_active FROM password_reset_tokens pr JOIN users u ON u.user_id=pr.user_id WHERE pr.selector_hash=? AND pr.used_at IS NULL AND pr.expires_at>NOW() FOR UPDATE");
    $stmt->execute([$tokenHash]);
    $reset = $stmt->fetch();
    if (!$reset || !(int)$reset['is_active']) {
        $pdo->rollBack();
        api_error('This reset link is invalid or expired.', 422);
    }
    $pdo->prepare("UPDATE users SET password_hash=? WHERE user_id=?")->execute([password_hash($password, PASSWORD_BCRYPT), $reset['user_id']]);
    $pdo->prepare("UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=? AND used_at IS NULL")->execute([$reset['user_id']]);
    $pdo->commit();
    unset($_SESSION['login_failures']);
    api_response(['success'=>true, 'message'=>'Password reset successfully. You can now log in.']);
}

api_error('Invalid action.', 422);
