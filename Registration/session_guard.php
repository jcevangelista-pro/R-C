<?php
// ============================================================
// Session Guard — include at top of protected pages
// Redirects to login if no active session
// Also prevents browser back-button caching
// ============================================================

session_start();

// Prevent caching so back button doesn't show protected pages after logout
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');

if (!isset($_SESSION['user_id'])) {
    header('Location: ../Registration/LogInPage.html');
    exit;
}
