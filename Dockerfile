FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node prisma ./prisma

USER node

RUN npm ci

COPY --chown=node:node . .

ENV NODE_ENV=production
ENV PORT=3011
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run db:generate && npm run build

EXPOSE 3011

CMD ["npm", "run", "docker:start"]
