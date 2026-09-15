FROM node:20-alpine

WORKDIR /app

# Install system dependencies needed by Prisma, native modules, and network utilities
RUN apk add --no-cache libc6-compat openssl

# Set build-time arguments and default environment variables so prisma generate and next build never fail
ARG DATABASE_URL="mysql://dummy:dummy@localhost:3306/bageshwari_b2b"
ARG NEXTAUTH_SECRET="simulcast-docker-build-secret-placeholder-32chars"
ARG AUTH_SECRET="simulcast-docker-build-secret-placeholder-32chars"

ENV NODE_ENV=production
ENV PORT=3011
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=$DATABASE_URL
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV AUTH_SECRET=$AUTH_SECRET
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Copy package descriptors and prisma schema first for efficient layer caching
COPY package.json package-lock.json ./
COPY prisma ./prisma

# Install all dependencies (including devDependencies required for build)
RUN npm install --legacy-peer-deps

# Copy all source files
COPY . .

# Generate Prisma client and build Next.js application
RUN npx prisma generate && npm run build

EXPOSE 3011

CMD ["node", "scripts/docker-start.mjs"]
