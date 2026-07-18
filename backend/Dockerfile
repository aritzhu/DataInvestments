FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.7.1 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
RUN pnpm prisma generate --schema=src/infrastructure/prisma/schema.prisma
RUN pnpm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.7.1 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile && pnpm add prisma@^5.22.0
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/infrastructure/prisma/schema.prisma ./src/infrastructure/prisma/schema.prisma
RUN pnpm prisma generate --schema=src/infrastructure/prisma/schema.prisma
ENV CI=true
RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1
CMD ["node", "dist/server.js"]
