<?php
session_start();
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

echo json_encode([
    'logged_in' => isset($_SESSION['user_id']),
    'role' => $_SESSION['role'] ?? null,
    'username' => $_SESSION['username'] ?? null
]);
