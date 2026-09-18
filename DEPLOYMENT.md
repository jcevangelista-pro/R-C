# Provider-neutral Apache deployment

This package targets Apache 2.4, PHP 8.1+, and MySQL/MariaDB. Laragon remains
supported for local development through safe local defaults.

## 1. What you need

- A domain and DNS access
- Apache 2.4 with `mod_rewrite` and `mod_headers`
- PHP 8.1 or newer with `pdo_mysql`, `fileinfo`, `openssl`, and `mbstring`
- MySQL/MariaDB database and a non-root application user
- SSH/terminal access or a hosting file manager and database importer
- SMTP account for password-reset mail
- TLS/SSL certificate for HTTPS
- A backup destination for the database and uploaded images

## 2. Upload and dependencies

Clone or upload the repository into the intended Apache document root. Then run:

```bash
composer install --no-dev --optimize-autoloader
cp .env.example .env
```

Do not upload a local `.env`, local database dump, payment proof, process
evidence, or profile photos. Composer is the recommended installation method
for the included PHPMailer SMTP dependency.

Private uploads were removed from current Git tracking by this deployment
preparation. If this repository was previously pushed anywhere, those files may
still exist in Git history. Before making the repository public, coordinate a
history rewrite with all collaborators (for example with `git filter-repo`) or
create a clean repository from the sanitized working tree. A history rewrite is
disruptive and should not be run casually on a shared branch.

## 3. Configure `.env`

Edit `.env` on the server. At minimum set:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.example
SESSION_SECURE=true

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=your_database
DB_USER=your_restricted_database_user
DB_PASSWORD=your_long_random_database_password

MAIL_TRANSPORT=smtp
MAIL_HOST=your.smtp.host
MAIL_PORT=587
MAIL_ENCRYPTION=tls
MAIL_AUTH=true
MAIL_USERNAME=your-smtp-username
MAIL_PASSWORD=your-smtp-password
MAIL_FROM_ADDRESS=no-reply@your-domain.example
MAIL_FROM_NAME=R&C Printing Services
```

If installed in a subdirectory, include it in `APP_URL`, for example
`https://example.com/printing`.

Restrict `.env` to the deployment user and web-server group (`chmod 640 .env`
on Linux). Never commit it.

## 4. Database

Create an empty database and a dedicated application user. Grant that user only
the privileges needed on this database, not global or administrative privileges.

For a fresh production database:

```bash
mysql -u YOUR_DB_USER -p YOUR_DB_NAME < database/schema.sql
```

`schema.sql` contains the workflow step definitions but no shared development
accounts or sample customer/order data.

Create a private first Owner account interactively:

```bash
php deployment/create_management_user.php owner
```

Do **not** import `database/seeds/development_accounts.sql` in production.

For an existing database, back it up first and apply only migrations that have
not already been applied, in numeric order. The current files are under
`database/migrations/`. Migrations are not all safe to run twice.

## 5. Apache

Point the virtual-host `DocumentRoot` to the repository root. An example is in
`deployment/apache-vhost.example.conf`. Ensure the directory permits
`AllowOverride All`; otherwise the included `.htaccess` protections will not
operate.

Enable required modules and reload Apache (commands vary by provider):

```bash
a2enmod rewrite headers ssl
apachectl configtest
systemctl reload apache2
```

Issue an SSL certificate, configure the HTTPS virtual host, test it, and only
then enable permanent HTTP-to-HTTPS redirection. Keep `SESSION_SECURE=true` in
production.

The included Apache rules disable directory listing, block internal/configuration
folders and sensitive file extensions, add baseline security headers, and block
script execution from product uploads.

## 6. Permissions

The web-server process needs write access only to:

- `OrderProcess/private_uploads/`
- `Products/uploads/`

On a typical Linux server, set ownership to the deployment user and web-server
group, directories to `750` or `770` as required, ordinary files to `640`, and
avoid `777`. Internal payment, process, and profile uploads are denied direct
web access and are served through authenticated PHP endpoints.

## 7. Preflight and go-live tests

Run:

```bash
php deployment/preflight.php
```

Resolve every `[FAIL]` before go-live. Then test in an incognito browser:

1. Guest Home, Products, Portfolio, and protected-action signup feedback
2. Customer signup/login/logout and SMTP password reset
3. Owner/Admin login and role restrictions
4. Product image upload and product bill of materials
5. Cart quantity, removal, and checkout
6. Pending-order details, accept/reject, and customer cancellation
7. Initial/final payment submission and management verification
8. Inventory deduction for a multi-product order and duplicate-deduction safety
9. Notifications, profile-photo persistence, and protected evidence access
10. Desktop and mobile layouts

## 8. Backups and operations

- Back up the database and both upload directories before every release.
- Keep at least one tested off-server backup.
- Enable PHP error logging but keep `display_errors` disabled.
- Review Apache/PHP logs after deployment and after workflow changes.
- Test a full restore before relying on the backup process.
- Change or deactivate all shared development accounts before production.

## Shared-hosting notes

If SSH is unavailable, run Composer locally with the same PHP version and upload
the generated `vendor/` directory. Use the hosting control panel for `.env`, the
database import, PHP extensions, writable directories, SMTP, SSL, and cron/backup
configuration. Confirm that `.htaccess` overrides are honored before exposing
the domain.
