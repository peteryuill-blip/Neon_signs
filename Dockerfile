FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
COPY patches/ ./patches/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
