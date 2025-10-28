FROM node:18-alpine AS base

# Enable pnpm via Corepack (bundled with Node 18)
RUN corepack enable
RUN corepack prepare pnpm@latest --activate

# Needed for some packages
RUN apk add --no-cache libc6-compat

FROM base AS builder
WORKDIR /app

# Copy package manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# Copy workspace package.json files
COPY apps/api/package.json ./apps/api/
# (add other apps/packages if needed)
COPY packages ./packages

# Install only the dependencies required for turbo
RUN pnpm install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Prune the repo for the api app
RUN pnpm turbo prune --scope=api --docker

FROM base AS installer
WORKDIR /app

# Copy pruned package.jsons + lockfile
COPY --from=builder /app/out/json/ ./

# Install dependencies for pruned build
RUN pnpm install --frozen-lockfile

# Copy full source (only what's needed for build)
COPY --from=builder /app/out/full/ ./

# Build the API (and deps)
RUN pnpm turbo build --filter=api...

FROM base AS runner
WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 expressjs
RUN adduser --system --uid 1001 expressjs
USER expressjs

# Copy built output
COPY --from=installer /app ./

# Start API
CMD ["node", "apps/api/dist/index.js"]
