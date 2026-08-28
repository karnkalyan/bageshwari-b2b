# Bageshwari Tractors B2B Commerce

Single-seller dealer commerce and fulfilment system for Bageshwari Tractors, Nepalgunj, Banke, Nepal. The application covers the public catalogue, protected dealer pricing, ordering, accounts review, Proforma invoices, warehouse picking, final invoices, payments/credit, packing, transport and dispatch.

## Development setup

Requirements: Node.js 20+, pnpm, and MySQL on `localhost:3306` with the root development user and blank password.

```bash
corepack pnpm install
copy .env.example .env
corepack pnpm prisma migrate dev
corepack pnpm prisma db seed
corepack pnpm dev
```

The default database URL is `mysql://root:@localhost:3306/bageshwari_b2b`. Set `SEED_PASSWORD` in `.env` before seeding; all development accounts use that value.

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
