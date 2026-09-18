<?php
declare(strict_types=1);

function load_local_environment(string $file): void
{
    if (!is_file($file) || !is_readable($file)) return;
    foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
        [$name, $value] = array_map('trim', explode('=', $line, 2));
        if (!preg_match('/^[A-Z][A-Z0-9_]*$/', $name)) continue;

        // Web-server values take precedence over the local file. Some shared
        // hosts disable putenv(), so configuration must not depend on it.
        $hasServerValue = array_key_exists($name, $_ENV) || array_key_exists($name, $_SERVER);
        $hasProcessValue = function_exists('getenv') && getenv($name) !== false;
        if ($hasServerValue || $hasProcessValue) continue;

        if (strlen($value) >= 2 && (($value[0] === '"' && str_ends_with($value, '"')) || ($value[0] === "'" && str_ends_with($value, "'")))) {
            $value = substr($value, 1, -1);
        }
        $_ENV[$name] = $value;
        $_SERVER[$name] = $value;
        if (function_exists('putenv')) {
            putenv($name . '=' . $value);
        }
    }
}

load_local_environment(dirname(__DIR__) . '/.env');

function env_value(string $name, ?string $default = null): ?string
{
    if (array_key_exists($name, $_ENV)) return (string)$_ENV[$name];
    if (array_key_exists($name, $_SERVER)) return (string)$_SERVER[$name];
    $value = function_exists('getenv') ? getenv($name) : false;
    return $value === false ? $default : $value;
}

function env_bool(string $name, bool $default = false): bool
{
    $value = env_value($name);
    return $value === null ? $default : filter_var($value, FILTER_VALIDATE_BOOLEAN);
}

function is_production(): bool
{
    return strtolower((string)env_value('APP_ENV', 'local')) === 'production';
}

function app_url(string $path = ''): string
{
    $base = rtrim((string)env_value('APP_URL', ''), '/');
    if ($base === '') {
        $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
        $host = (string)($_SERVER['HTTP_HOST'] ?? 'localhost');
        if (!preg_match('/^[A-Za-z0-9.-]+(?::\d+)?$/', $host)) $host = 'localhost';
        $base = ($https ? 'https' : 'http') . '://' . $host;
    }
    return $base . '/' . ltrim($path, '/');
}

if (is_production() && !env_bool('APP_DEBUG', false)) {
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');
}
