# syntax=docker/dockerfile:1

# ---------- build stage ----------
FROM node:22-slim AS builder

# Toolchain for better-sqlite3 in case no prebuilt binary matches the platform.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first so this layer is cached while sources change.
COPY package.json yarn.lock lerna.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN yarn install --frozen-lockfile

COPY client client
COPY server server

RUN yarn workspace presight-client build \
  && yarn workspace presight-server build \
  # Drop devDependencies from node_modules so the runtime image stays small.
  && yarn install --frozen-lockfile --production \
  && yarn cache clean

# ---------- runtime stage ----------
FROM node:22-slim AS runtime

ENV NODE_ENV=production \
    PORT=8080 \
    DATABASE_PATH=/data/users.db \
    SEED_USERS=1000

WORKDIR /app

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server ./server
# Express serves these static assets (config.publicDir defaults to ../client/dist).
COPY --from=builder /app/client/dist ./client/dist

# The SQLite file lives on a volume; the server seeds it on first boot when empty.
RUN mkdir -p /data && chown -R node:node /data /app
USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/dist/index.js"]
