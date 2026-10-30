<?php
require_once __DIR__ . '/../config/session.php';
start_app_session();
header('Content-Type: application/json');

require_once __DIR__ . '/../database/connection.php';
require_once __DIR__ . '/../config/mail.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

switch ($action) {

    // ── SIGN UP ─────────────────────────────────────────────
    case 'signup':
        $firstName  = trim($input['first_name'] ?? '');
        $middleName = trim($input['middle_name'] ?? '');
        $lastName   = trim($input['last_name'] ?? '');
        $email      = trim($input['email'] ?? '');
        $username   = trim($input['username'] ?? '');
        $password   = $input['password'] ?? '';

        // Validation
        if (!$firstName || !$lastName || !$email || !$username || !$password) {
            echo json_encode(['success' => false, 'error' => 'All required fields must be filled.']);
            exit;
        }

        if (strlen($username) < 8) {
            echo json_encode(['success' => false, 'error' => 'Username must be at least 8 characters.']);
            exit;
        }

        if (strlen($password) < 8) {
            echo json_encode(['success' => false, 'error' => 'Password must be at least 8 characters.']);
            exit;
        }

        if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/', $password)) {
            echo json_encode(['success' => false, 'error' => 'Password must contain uppercase, lowercase, number, and special character.']);
            exit;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['success' => false, 'error' => 'Invalid email address.']);
            exit;
        }

        // Check if email or username already exists
        $stmt = $pdo->prepare('SELECT user_id FROM users WHERE email = ? OR username = ?');
        $stmt->execute([$email, $username]);
        if ($stmt->fetch()) {
            echo json_encode(['success' => false, 'error' => 'Email or username already exists.']);
            exit;
        }

        // Hash password
        $hash = password_hash($password, PASSWORD_BCRYPT);

        // Stage the signup: the account is only created after the emailed
        // verification code is confirmed (see 'verify_code' below).
        $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $_SESSION['pending_signup'] = [
            'first_name' => $firstName,
            'middle_name' => $middleName ?: null,
            'last_name' => $lastName,
            'email' => $email,
            'username' => $username,
            'password_hash' => $hash,
            'code' => $code,
            'expires' => time() + 600,
            'attempts' => 0
        ];

        $subject = 'R&C Printing Services - Email Verification Code';
        $message = "Hello {$firstName},\n\n"
            . "Your email verification code is: {$code}\n\n"
            . "This code expires in 10 minutes. If you did not request this, ignore this email.";
        if (!send_application_mail($email, $subject, $message)) {
            unset($_SESSION['pending_signup']);
            echo json_encode(['success' => false, 'error' => 'Unable to send the verification email. Please try again.']);
            exit;
        }

        echo json_encode([
            'success' => true,
            'message' => 'A verification code was sent to your email.',
            'pending_verification' => true,
            'email' => $email
        ]);
        break;

    // ── VERIFY EMAIL CODE ───────────────────────────────────
    case 'verify_code': {
        $code = trim($input['code'] ?? '');
        $pending = $_SESSION['pending_signup'] ?? null;

        if (!$pending) {
            echo json_encode(['success' => false, 'error' => 'No pending signup. Please sign up again.', 'attempts_left' => 0]);
            exit;
        }

        if (time() > $pending['expires']) {
            unset($_SESSION['pending_signup']);
            echo json_encode(['success' => false, 'error' => 'The code has expired. Please sign up again.', 'attempts_left' => 0]);
            exit;
        }

        if (hash_equals($pending['code'], $code)) {
            // Code correct - create the account now.
            $pdo->beginTransaction();
            $stmt = $pdo->prepare(
                'INSERT INTO users (first_name, middle_name, last_name, email, username, password_hash, role)
                 VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $pending['first_name'], $pending['middle_name'], $pending['last_name'],
                $pending['email'], $pending['username'], $pending['password_hash'], 'customer'
            ]);
            $userId = $pdo->lastInsertId();
            $stmt = $pdo->prepare("INSERT INTO customers (user_id, phone_num, address) VALUES (?, '', '')");
            $stmt->execute([$userId]);
            $pdo->commit();

            unset($_SESSION['pending_signup']);

            session_regenerate_id(true);
            $_SESSION['user_id'] = $userId;
            $_SESSION['username'] = $pending['username'];
            $_SESSION['role'] = 'customer';

            echo json_encode([
                'success' => true,
                'message' => 'Email verified. Account created successfully.',
                'user' => [
                    'user_id' => (int)$userId,
                    'username' => $pending['username'],
                    'role' => 'customer'
                ]
            ]);
            exit;
        }

        // Wrong code - count the attempt; after 3 failures the pending signup is dropped.
        $pending['attempts']++;
        $left = 3 - $pending['attempts'];
        if ($left <= 0) {
            unset($_SESSION['pending_signup']);
            echo json_encode(['success' => false, 'error' => 'Email is not verified. Please sign up again.', 'attempts_left' => 0]);
            exit;
        }
        $_SESSION['pending_signup'] = $pending;
        echo json_encode(['success' => false, 'error' => 'Incorrect verification code.', 'attempts_left' => $left]);
        break;
    }

    // ── RESEND VERIFICATION CODE ────────────────────────────
    case 'resend_code': {
        $pending = $_SESSION['pending_signup'] ?? null;
        if (!$pending) {
            echo json_encode(['success' => false, 'error' => 'No pending signup. Please sign up again.']);
            exit;
        }

        $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $pending['code'] = $code;
        $pending['expires'] = time() + 600;
        $_SESSION['pending_signup'] = $pending;

        $subject = 'R&C Printing Services - Email Verification Code';
        $message = "Hello {$pending['first_name']},\n\n"
            . "Your email verification code is: {$code}\n\n"
            . "This code expires in 10 minutes. If you did not request this, ignore this email.";
        if (!send_application_mail($pending['email'], $subject, $message)) {
            echo json_encode(['success' => false, 'error' => 'Unable to resend the verification email. Please try again.']);
            exit;
        }

        echo json_encode(['success' => true, 'message' => 'A new verification code has been sent to your email.']);
        break;
    }

    // ── LOG IN ──────────────────────────────────────────────
    case 'login':
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';
        $now = time();
        $failures = array_values(array_filter($_SESSION['login_failures'] ?? [], fn($timestamp) => $timestamp > $now - 900));
        if (count($failures) >= 5) {
            http_response_code(429);
            echo json_encode(['success'=>false,'error'=>'Too many login attempts. Try again in 15 minutes.']);
            exit;
        }
        $recordFailure = function() use (&$failures): void {
            $failures[] = time();
            $_SESSION['login_failures'] = $failures;
        };

        if (!$username || !$password) {
            echo json_encode(['success' => false, 'error' => 'Username and password are required.']);
            exit;
        }

        // Find user
        $stmt = $pdo->prepare('SELECT user_id, username, password_hash, role, is_active FROM users WHERE username = ?');
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if (!$user) {
            $recordFailure();
            echo json_encode(['success' => false, 'error' => 'Invalid username or password.']);
            exit;
        }

        if (!$user['is_active']) {
            echo json_encode(['success' => false, 'error' => 'This account has been deactivated.']);
            exit;
        }

        if (!password_verify($password, $user['password_hash'])) {
            $recordFailure();
            echo json_encode(['success' => false, 'error' => 'Invalid username or password.']);
            exit;
        }

        // Update last login
        $stmt = $pdo->prepare('UPDATE users SET last_login = NOW() WHERE user_id = ?');
        $stmt->execute([$user['user_id']]);

        // Set session
        session_regenerate_id(true);
        unset($_SESSION['login_failures']);
        $_SESSION['user_id'] = $user['user_id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['role'] = $user['role'];

        // Determine redirect based on role
        $redirect = '../LandingPage/LandingPage.php';
        if ($user['role'] === 'admin' || $user['role'] === 'owner') {
            $redirect = '../Dashboard/Dashboard.html';
        }

        echo json_encode([
            'success' => true,
            'message' => 'Login successful.',
            'user' => [
                'user_id' => (int)$user['user_id'],
                'username' => $user['username'],
                'role' => $user['role']
            ],
            'redirect' => $redirect
        ]);
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'Invalid action.']);
        break;
}
