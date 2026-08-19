<?php
// ============================================================
// Admin/Owner Session Guard
// Include at top of all admin pages (Dashboard, Inventory, etc.)
// Redirects to login if no session or not admin/owner
// ============================================================

session_start();

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');

if (!isset($_SESSION['user_id']) || !in_array($_SESSION['role'], ['admin', 'owner'])) {
    header('Location: ../Registration/LogInPage.html');
    exit;
}

$loggedInUsername = $_SESSION['username'] ?? 'User';
$loggedInRole = ucfirst($_SESSION['role'] ?? 'admin');
