<?php
declare(strict_types=1);
require_once __DIR__ . '/../database/api_bootstrap.php';

$userId = require_login();
$stmt = $pdo->prepare("SELECT profile_image_path FROM users WHERE user_id=?");
$stmt->execute([$userId]);
$relative = $stmt->fetchColumn();
if (!$relative) api_error('Profile photo not found.', 404);

$storageRoot = realpath(dirname(__DIR__) . '/OrderProcess/private_uploads');
$file = realpath(dirname(__DIR__) . '/' . ltrim((string)$relative, '/'));
if (!$storageRoot || !$file || !str_starts_with($file, $storageRoot . DIRECTORY_SEPARATOR) || !is_file($file)) {
    api_error('Profile photo not found.', 404);
}

$mime = (new finfo(FILEINFO_MIME_TYPE))->file($file) ?: 'application/octet-stream';
header_remove('Content-Type');
header('Content-Type: ' . $mime);
header('Content-Length: ' . filesize($file));
header('Cache-Control: private, max-age=3600');
header('Content-Disposition: inline; filename="profile-photo.' . pathinfo($file, PATHINFO_EXTENSION) . '"');
readfile($file);
exit;
