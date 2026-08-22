<?php
session_start();
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
require_once __DIR__ . '/../database/connection.php';

$userId = $_SESSION['user_id'] ?? null;

if (!$userId) {
    echo json_encode(['success' => true, 'count' => 0]);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0");
    $stmt->execute([$userId]);
    $count = (int)$stmt->fetchColumn();

    echo json_encode(['success' => true, 'count' => $count]);
} catch (Exception $e) {
    echo json_encode(['success' => true, 'count' => 0]);
}
