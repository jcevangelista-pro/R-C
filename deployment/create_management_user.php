<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once dirname(__DIR__) . '/database/connection.php';

$role = strtolower((string)($argv[1] ?? 'owner'));
if (!in_array($role, ['owner', 'admin'], true)) {
    fwrite(STDERR, "Usage: php deployment/create_management_user.php [owner|admin]" . PHP_EOL);
    exit(1);
}

$ask = static function (string $label): string {
    $value = readline($label . ': ');
    return trim($value === false ? '' : $value);
};

$askPassword = static function (string $label): string {
    if (DIRECTORY_SEPARATOR === '/' && function_exists('shell_exec')) {
        fwrite(STDOUT, $label . ': ');
        shell_exec('stty -echo');
        $value = trim((string)fgets(STDIN));
        shell_exec('stty echo');
        fwrite(STDOUT, PHP_EOL);
        return $value;
    }
    return trim((string)readline($label . ' (input may be visible): '));
};

$firstName = $ask('First name');
$lastName = $ask('Last name');
$email = strtolower($ask('Email'));
$username = $ask('Username (minimum 8 characters)');
$password = $askPassword('Temporary password (8+ chars with upper/lower/number/symbol)');

if ($firstName === '' || $lastName === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, 'Valid name and email are required.' . PHP_EOL);
    exit(1);
}
if (strlen($username) < 8 || !preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/', $password)) {
    fwrite(STDERR, 'Username or password does not satisfy the application rules.' . PHP_EOL);
    exit(1);
}

$stmt = $pdo->prepare('SELECT user_id FROM users WHERE email=? OR username=?');
$stmt->execute([$email, $username]);
if ($stmt->fetch()) {
    fwrite(STDERR, 'That email or username already exists.' . PHP_EOL);
    exit(1);
}

$stmt = $pdo->prepare('INSERT INTO users (first_name,last_name,email,username,password_hash,role,is_active) VALUES (?,?,?,?,?,?,1)');
$stmt->execute([$firstName, $lastName, $email, $username, password_hash($password, PASSWORD_BCRYPT), $role]);
echo ucfirst($role) . ' account created with user ID ' . $pdo->lastInsertId() . '.' . PHP_EOL;
