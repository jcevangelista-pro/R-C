<?php
session_start();
session_unset();
session_destroy();

// Prevent caching so back button won't show protected pages
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');

header('Location: LogInPage.html');
exit;
