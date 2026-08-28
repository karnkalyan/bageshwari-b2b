# Bageshwari Tractors B2B Commerce

Single-seller dealer commerce and fulfilment system for Bageshwari Tractors, Nepalgunj, Banke, Nepal. The application covers the public catalogue, protected dealer pricing, ordering, accounts review, Proforma invoices, warehouse picking, final invoices, payments/credit, packing, transport and dispatch.

## Local development

Requirements: Node.js 20+, pnpm, and MySQL. Copy `.env.example` to `.env` and replace the Docker-oriented entries with a local `DATABASE_URL`, `AUTH_URL`, `AUTH_SECRET`, and `SEED_PASSWORD`. No credential has an application fallback.

```bash
corepack pnpm install
corepack pnpm prisma db push
corepack pnpm db:seed
corepack pnpm dev
```

## Secure Docker deployment

The Compose stack is fail-closed: database metadata, the public URL, bind address, port, and all secret-file paths must be set. Passwords are mounted as read-only Docker secrets and are not included in the image or Compose environment.

```bash
cp .env.example .env
mkdir -p secrets
openssl rand -base64 48 > secrets/auth_secret.txt
openssl rand -base64 24 > secrets/seed_password.txt
read -rsp "MySQL password: " DB_PASSWORD && printf '%s' "$DB_PASSWORD" > secrets/database_password.txt && unset DB_PASSWORD
chmod 600 .env secrets/*.txt
```

Edit `.env` for the production database, HTTPS URL, and listener. The recommended host setup binds the container to `127.0.0.1` and exposes it through a TLS reverse proxy.

Apply committed migrations, load the idempotent seed dataset, then recreate the application:

```bash
docker compose build --pull
docker compose run --rm seed
docker compose up -d --remove-orphans --force-recreate app
docker compose ps
docker compose logs --tail=100 app
```

The schema synchronization service runs automatically before `app` and uses `prisma db push` because the existing production database was originally provisioned without Prisma migration history. It never accepts data-loss operations automatically. The explicit seed command is intentional: it prevents seed data and account password updates from running on every restart. Uploaded files and the Next.js runtime cache use named volumes. The example configuration publishes the application on host port `3011` while Next.js continues listening on container port `3000`.

Primary routes:

- Storefront: `/`, `/products`, `/products/[sku]`
- Dealer access: `/dealer/login`, `/dealer/dashboard`
- Staff access: `/staff/login`
- Operations: `/admin/dashboard`, `/sales/dashboard`, `/accounts/dashboard`, `/warehouse/dashboard`, `/dispatch/dashboard`

## Verification

```bash
corepack pnpm prisma format
corepack pnpm prisma validate
corepack pnpm prisma generate
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm test:e2e
corepack pnpm build
```

Anonymous catalogue responses are constructed from a Prisma select that never queries dealer prices. Authorized dealer responses resolve dealer-specific, group, quantity, promotional and default dealer pricing on the server.
