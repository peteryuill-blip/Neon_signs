# ─── Build stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# Copy lockfile and manifests first for layer caching
COPY package.json pnpm-lock.yaml* ./
COPY patches/ ./patches/

# Install all dependencies (including devDeps needed for build)
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build: Vite (client) + esbuild (server)
RUN pnpm build

# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# Copy manifests and install production deps only
COPY package.json pnpm-lock.yaml* ./
COPY patches/ ./patches/
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle

# Expose the port (Railway sets PORT env var automatically)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3000}/api/trpc/auth.me || exit 1

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
