<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once dirname(__DIR__) . '/config/app.php';

$checks = [];
$check = function (string $label, bool $passed, string $detail = '') use (&$checks): void {
    $checks[] = [$label, $passed, $detail];
};

$check('PHP 8.1+', version_compare(PHP_VERSION, '8.1.0', '>='), PHP_VERSION);
foreach (['pdo_mysql', 'fileinfo', 'openssl', 'mbstring'] as $extension) {
    $check('Extension ' . $extension, extension_loaded($extension));
}
$check('.env exists', is_file(dirname(__DIR__) . '/.env'));
$check('APP_ENV=production', is_production(), (string)env_value('APP_ENV', 'local'));
$check('HTTPS APP_URL', str_starts_with((string)env_value('APP_URL', ''), 'https://'), (string)env_value('APP_URL', ''));
$check('Non-root DB user', (string)env_value('DB_USER', 'root') !== 'root');
$check('DB password configured', (string)env_value('DB_PASSWORD', '') !== '');
$check('Private uploads writable', is_writable(dirname(__DIR__) . '/OrderProcess/private_uploads'));
$check('Product uploads writable', is_writable(dirname(__DIR__) . '/Products/uploads'));

if (strtolower((string)env_value('MAIL_TRANSPORT', 'mail')) === 'smtp') {
    $check('Composer dependencies installed', is_file(dirname(__DIR__) . '/vendor/autoload.php'));
    $check('SMTP host configured', (string)env_value('MAIL_HOST', '') !== '');
    $check('SMTP sender configured', filter_var(env_value('MAIL_FROM_ADDRESS', ''), FILTER_VALIDATE_EMAIL) !== false);
}

try {
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', env_value('DB_HOST', 'localhost'), (int)env_value('DB_PORT', '3306'), env_value('DB_NAME', 'rnc'));
    $database = new PDO($dsn, env_value('DB_USER', ''), env_value('DB_PASSWORD', ''), [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
    $check('Database connection', true);
    $requiredTables = ['users','customers','products','inventory','product_materials','orders','order_details','process_steps','order_process','notifications','payments','audit_logs','cart','password_reset_tokens'];
    foreach ($requiredTables as $table) {
        $stmt = $database->prepare('SHOW TABLES LIKE ?');
        $stmt->execute([$table]);
        $check('Table ' . $table, (bool)$stmt->fetchColumn());
    }
    $stmt = $database->query("SHOW COLUMNS FROM users LIKE 'profile_image_path'");
    $check('Profile image migration', (bool)$stmt->fetch());
} catch (Throwable $error) {
    $check('Database connection', false, $error->getMessage());
}

$failed = false;
foreach ($checks as [$label, $passed, $detail]) {
    $failed = $failed || !$passed;
    echo ($passed ? '[PASS] ' : '[FAIL] ') . $label . ($detail !== '' ? ' - ' . $detail : '') . PHP_EOL;
}
exit($failed ? 1 : 0);

