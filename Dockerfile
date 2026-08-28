# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl \
    && corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm exec prisma generate \
    && pnpm run build

FROM base AS tools
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --chown=nextjs:nodejs package.json pnpm-lock.yaml product.xlsx ./
COPY --chown=nextjs:nodejs prisma ./prisma
COPY --chown=nextjs:nodejs docker/entrypoint.mjs ./docker/entrypoint.mjs
RUN pnpm exec prisma generate
USER nextjs
ENTRYPOINT ["node", "/app/docker/entrypoint.mjs"]

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --chown=nextjs:nodejs docker/entrypoint.mjs ./docker/entrypoint.mjs
RUN mkdir -p /app/public/uploads /app/.next/cache \
    && chown -R nextjs:nodejs /app/public/uploads /app/.next/cache
USER nextjs
EXPOSE 3000
ENTRYPOINT ["node", "/app/docker/entrypoint.mjs"]
CMD ["node", "server.js"]
