<?php
declare(strict_types=1);
require_once __DIR__ . '/../database/api_bootstrap.php';

$orderId = trim($_GET['order_id'] ?? '');
$kind = $_GET['kind'] ?? 'payment';
require_order_access($pdo, $orderId);
if ($kind === 'payment') {
    $stmt = $pdo->prepare("SELECT proof_path FROM payments WHERE order_id=? AND proof_path IS NOT NULL ORDER BY created_at DESC LIMIT 1");
    $stmt->execute([$orderId]);
} elseif ($kind === 'process') {
    $step = (int)($_GET['step'] ?? 0);
    $stmt = $pdo->prepare("SELECT op.image FROM order_process op JOIN process_steps ps ON ps.process_step_id=op.process_step_id WHERE op.order_id=? AND ps.step_number=?");
    $stmt->execute([$orderId,$step]);
} else api_error('Invalid evidence type.', 422);
$relative = $stmt->fetchColumn();
if (!$relative) api_error('Evidence not found.', 404);
$storageRoot = realpath(__DIR__ . '/private_uploads');
$file = realpath(dirname(__DIR__) . '/' . ltrim((string)$relative, '/'));
if (!$storageRoot || !$file || !str_starts_with($file, $storageRoot . DIRECTORY_SEPARATOR) || !is_file($file)) api_error('Evidence not found.', 404);
$mime = (new finfo(FILEINFO_MIME_TYPE))->file($file) ?: 'application/octet-stream';
header('Content-Type: '.$mime);
header('Content-Length: '.filesize($file));
header('Content-Disposition: inline; filename="evidence.'.pathinfo($file, PATHINFO_EXTENSION).'"');
readfile($file);
exit;

