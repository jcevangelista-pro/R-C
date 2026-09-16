# Shared development accounts

These accounts are for local development and demonstrations only.

| Role | Username | Password |
|---|---|---|
| Owner | `@RNCOwner` | `Owner@2026!` |
| Admin | `@RNCAdmin` | `Admin@2026!` |

For a fresh database, importing `schema.sql` creates both accounts.

For an existing database, import `seeds/development_accounts.sql`. The seed is
safe to run again and restores these development passwords and active roles.

Never use these shared credentials in production. Before deployment, create
private management accounts, verify them, and delete or deactivate these two
development users.
