<?php
declare(strict_types=1);
require_once __DIR__ . '/app.php';

function send_application_mail(string $recipient, string $subject, string $body): bool
{
    $fromAddress = (string)env_value('MAIL_FROM_ADDRESS', 'no-reply@localhost');
    $fromName = (string)env_value('MAIL_FROM_NAME', 'R&C Printing Services');
    $transport = strtolower((string)env_value('MAIL_TRANSPORT', 'mail'));

    if ($transport === 'smtp') {
        $autoload = dirname(__DIR__) . '/vendor/autoload.php';
        if (!is_file($autoload)) {
            error_log('SMTP is configured but Composer dependencies are missing. Run composer install.');
            return false;
        }
        require_once $autoload;
        try {
            $mailer = new PHPMailer\PHPMailer\PHPMailer(true);
            $mailer->isSMTP();
            $mailer->Host = (string)env_value('MAIL_HOST', '');
            $mailer->Port = (int)env_value('MAIL_PORT', '587');
            $mailer->SMTPAuth = env_bool('MAIL_AUTH', true);
            $mailer->Username = (string)env_value('MAIL_USERNAME', '');
            $mailer->Password = (string)env_value('MAIL_PASSWORD', '');
            $encryption = strtolower((string)env_value('MAIL_ENCRYPTION', 'tls'));
            if ($encryption === 'ssl') $mailer->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
            elseif ($encryption === 'tls') $mailer->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            else $mailer->SMTPAutoTLS = false;
            $mailer->CharSet = 'UTF-8';
            $mailer->setFrom($fromAddress, $fromName);
            $mailer->addAddress($recipient);
            $mailer->Subject = $subject;
            $mailer->Body = $body;
            return $mailer->send();
        } catch (Throwable $error) {
            error_log('SMTP delivery failed: ' . $error->getMessage());
            return false;
        }
    }

    $safeName = str_replace(["\r", "\n"], '', $fromName);
    $safeAddress = str_replace(["\r", "\n"], '', $fromAddress);
    return mail($recipient, $subject, $body, "From: {$safeName} <{$safeAddress}>\r\nContent-Type: text/plain; charset=UTF-8");
}

