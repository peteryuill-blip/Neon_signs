# Single-stage build: install all deps, build, then run
# (avoids the prod-only prune issue where runtime packages go missing)
FROM node:22-alpine

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# Copy manifests
COPY package.json pnpm-lock.yaml* ./

# Copy patches directory if it exists
COPY patches/ ./patches/

# Install ALL dependencies (dev + prod) needed for build
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build: Vite (client) + esbuild (server)
RUN pnpm build

# Remove dev-only packages to slim the image
# Keep all dependencies that dist/index.js needs at runtime
RUN pnpm prune --prod --no-optional || true

# Re-install only what's needed (some packages move between dev/prod)
# This ensures bcryptjs, mysql2, drizzle-orm etc. are present
RUN pnpm install --prod --frozen-lockfile || pnpm install --frozen-lockfile

# Expose port
EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
