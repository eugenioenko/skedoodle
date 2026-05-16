# Stage 1: Build client
FROM node:22-alpine AS client-build
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY server/prisma ./server/prisma
COPY server/prisma.config.ts ./server/
RUN pnpm install --frozen-lockfile --shamefully-hoist
COPY client/ ./client/
ARG VITE_API_URL="/api"
ARG VITE_WS_URL="ws://localhost:3014"
ARG VITE_OIDC_ISSUER_URL=""
ARG VITE_OIDC_CLIENT_ID=""
RUN cd client && VITE_API_URL=$VITE_API_URL VITE_WS_URL=$VITE_WS_URL VITE_OIDC_ISSUER_URL=$VITE_OIDC_ISSUER_URL VITE_OIDC_CLIENT_ID=$VITE_OIDC_CLIENT_ID npx vite build

# Stage 2: Build server
FROM node:22-alpine AS server-build
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY server/prisma ./server/prisma
COPY server/prisma.config.ts ./server/
RUN pnpm install --frozen-lockfile --shamefully-hoist
COPY server/ ./server/
RUN cd server && npx prisma generate
RUN cd server && pnpm build

# Stage 3: Production
FROM node:22-alpine
WORKDIR /app

COPY --from=server-build /app/server/dist ./dist
COPY --from=server-build /app/node_modules ./node_modules
COPY --from=server-build /app/server/prisma ./prisma
COPY --from=server-build /app/server/package.json ./
COPY --from=client-build /app/client/dist ./public

RUN mkdir -p /app/data

EXPOSE 3013 3014

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/http-server.js"]
