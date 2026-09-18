<?php
declare(strict_types=1);
require_once __DIR__ . '/../config/app.php';

// Local defaults preserve Laragon compatibility. Production must provide all
// DB_* values through the server environment or the uncommitted .env file.
$host = (string)env_value('DB_HOST', 'localhost');
$port = (int)env_value('DB_PORT', '3306');
$dbname = (string)env_value('DB_NAME', 'rnc');
$username = (string)env_value('DB_USER', 'root');
$password = (string)env_value('DB_PASSWORD', '');

if (is_production() && ($dbname === '' || $username === 'root' || $password === '')) {
    error_log('Production database configuration is incomplete or unsafe.');
    http_response_code(500);
    echo json_encode(['error' => 'Server configuration error.']);
    exit;
}

try {
    $pdo = new PDO(
        "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $e) {
    error_log($e->__toString());
    http_response_code(500);
    echo json_encode(['error' => is_production() ? 'Database service unavailable.' : 'Database connection failed: ' . $e->getMessage()]);
    exit;
}
