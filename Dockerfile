# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy dependencies first for caching
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm run build

# Stage 2: Production Run
FROM node:20-slim

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy built artifacts from builder
COPY --from=builder /app/.output ./.output

# Expose the standard Nuxt port
EXPOSE 3000

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

# Start the server
CMD ["node", ".output/server/index.mjs"]
