<?php
if (session_status() !== PHP_SESSION_ACTIVE) {
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_set_cookie_params(['httponly'=>true,'secure'=>$isHttps,'samesite'=>'Lax','path'=>'/']);
    session_start();
}
header('Content-Type: application/json');

require_once __DIR__ . '/../database/connection.php';

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

        $pdo->beginTransaction();
        // Insert user (role defaults to 'customer')
        $stmt = $pdo->prepare(
            'INSERT INTO users (first_name, middle_name, last_name, email, username, password_hash, role)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$firstName, $middleName ?: null, $lastName, $email, $username, $hash, 'customer']);
        $userId = $pdo->lastInsertId();
        $stmt = $pdo->prepare("INSERT INTO customers (user_id, phone_num, address) VALUES (?, '', '')");
        $stmt->execute([$userId]);
        $pdo->commit();

        // Set session
        session_regenerate_id(true);
        $_SESSION['user_id'] = $userId;
        $_SESSION['username'] = $username;
        $_SESSION['role'] = 'customer';

        echo json_encode([
            'success' => true,
            'message' => 'Account created successfully.',
            'user' => [
                'user_id' => (int)$userId,
                'username' => $username,
                'role' => 'customer'
            ]
        ]);
        break;

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
