# Bageshwari Tractors B2B Commerce

## Docker deployment

The deployment uses one application container, npm, MySQL on the Docker host, and port `3011`. Container startup synchronizes the Prisma schema, loads the seed dataset, and starts Next.js.

```bash
git pull origin main
docker compose down --remove-orphans
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

The Docker database connection is configured for database `bageshwari_b2b`, user `admin`, and the requested database password. Ensure MySQL permits that user to connect from Docker containers.

## Local development

```bash
cp .env.example .env
npm install
npm run db:push
npm run db:seed
npm run dev
```

## Verification

```bash
npm run db:generate
npm run typecheck
npm run test
npm run build
```
