<?php
declare(strict_types=1);
require_once __DIR__ . '/app.php';

function start_app_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $requestIsHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    $secure = env_bool('SESSION_SECURE', $requestIsHttps);
    ini_set('session.use_only_cookies', '1');
    ini_set('session.use_strict_mode', '1');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

