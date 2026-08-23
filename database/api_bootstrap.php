<?php
declare(strict_types=1);

if (session_status() !== PHP_SESSION_ACTIVE) {
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_set_cookie_params([
        'httponly' => true,
        'secure' => $isHttps,
        'samesite' => 'Lax',
        'path' => '/',
    ]);
    session_start();
}

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');
header('Cache-Control: no-store');

require_once __DIR__ . '/connection.php';

function api_response(array $payload, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function api_error(string $message, int $status = 400): never
{
    api_response(['success' => false, 'error' => $message], $status);
}

function current_user_id(): ?int
{
    return isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : null;
}

function current_role(): ?string
{
    return isset($_SESSION['role']) ? strtolower((string)$_SESSION['role']) : null;
}

function require_login(): int
{
    $userId = current_user_id();
    if (!$userId) api_error('Authentication required.', 401);
    return $userId;
}

function require_role(array $roles): int
{
    $userId = require_login();
    if (!in_array(current_role(), $roles, true)) api_error('You are not authorized to perform this action.', 403);
    return $userId;
}

function json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) return [];
    $body = json_decode($raw, true);
    if (!is_array($body)) api_error('Invalid JSON request body.');
    return $body;
}

function require_same_origin(): void
{
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if (in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) return;
    $host = strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $referer = $_SERVER['HTTP_REFERER'] ?? '';
    $source = $origin !== '' ? $origin : $referer;
    if ($source !== '') {
        $sourceHost = strtolower((string)parse_url($source, PHP_URL_HOST));
        $sourcePort = parse_url($source, PHP_URL_PORT);
        $sourceAuthority = $sourceHost . ($sourcePort ? ':' . $sourcePort : '');
        if ($sourceAuthority !== $host) api_error('Cross-site request rejected.', 403);
    }
}

require_same_origin();

function require_order_access(PDO $pdo, string $orderId, bool $managementOnly = false): array
{
    $userId = require_login();
    $stmt = $pdo->prepare("SELECT o.*, c.user_id AS customer_user_id FROM orders o JOIN customers c ON c.customer_id=o.customer_id WHERE o.order_id=?");
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();
    if (!$order) api_error('Order not found.', 404);
    $isManagement = in_array(current_role(), ['admin', 'owner'], true);
    if ($managementOnly && !$isManagement) api_error('Management access required.', 403);
    if (!$isManagement && (int)$order['customer_user_id'] !== $userId) api_error('You do not have access to this order.', 403);
    return $order;
}

function audit_event(PDO $pdo, string $eventType, ?string $orderId = null, array $details = []): void
{
    try {
        $stmt = $pdo->prepare("INSERT INTO audit_logs (user_id, order_id, event_type, details_json, ip_address) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([current_user_id(), $orderId, $eventType, json_encode($details), $_SERVER['REMOTE_ADDR'] ?? null]);
    } catch (Throwable $ignored) {
        // Allows a staged deployment before the migration is applied.
    }
}

function calculate_order_totals(PDO $pdo, string $orderId, bool $lock = false): array
{
    $suffix = $lock ? ' FOR UPDATE' : '';
    $stmt = $pdo->prepare("SELECT COALESCE(SUM(quantity * unit_price),0) FROM order_details WHERE order_id=?" . $suffix);
    $stmt->execute([$orderId]);
    $productTotal = round((float)$stmt->fetchColumn(), 2);
    $stmt = $pdo->prepare("SELECT discount_percent, rush_fee, delivery_fee FROM orders WHERE order_id=?" . $suffix);
    $stmt->execute([$orderId]);
    $order = $stmt->fetch();
    if (!$order) api_error('Order not found.', 404);
    $discountPercent = min(100, max(0, (float)$order['discount_percent']));
    $deducted = round($productTotal * $discountPercent / 100, 2);
    $total = max(0, round($productTotal - $deducted + (float)$order['rush_fee'] + (float)$order['delivery_fee'], 2));
    $stmt = $pdo->prepare("UPDATE orders SET product_total=?, amount_deducted=?, total_amount=?, remaining_balance=GREATEST(0, ?-amount_paid) WHERE order_id=?");
    $stmt->execute([$productTotal, $deducted, $total, $total, $orderId]);
    return ['product_total'=>$productTotal, 'amount_deducted'=>$deducted, 'total_amount'=>$total];
}

function store_image_upload(array $file, string $folder): string
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) api_error('A valid image upload is required.', 422);
    if (($file['size'] ?? 0) > 5 * 1024 * 1024) api_error('Image must be 5 MB or smaller.', 422);
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $extensions = ['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'];
    if (!isset($extensions[$mime]) || @getimagesize($file['tmp_name']) === false) api_error('Only valid JPG, PNG, or WebP images are allowed.', 422);
    $base = dirname(__DIR__) . '/OrderProcess/private_uploads/' . trim($folder, '/');
    if (!is_dir($base) && !mkdir($base, 0750, true) && !is_dir($base)) api_error('Upload storage is unavailable.', 500);
    $name = bin2hex(random_bytes(16)) . '.' . $extensions[$mime];
    if (!move_uploaded_file($file['tmp_name'], $base . '/' . $name)) api_error('Unable to store uploaded image.', 500);
    return 'OrderProcess/private_uploads/' . trim($folder, '/') . '/' . $name;
}
