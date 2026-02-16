# Stage 1: Build client
FROM node:22-alpine AS client-build
RUN npm install -g pnpm
WORKDIR /app/client
COPY client/package.json client/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY client/ .
ARG VITE_API_URL="/api"
ARG VITE_WS_URL="ws://localhost:3014"
RUN VITE_API_URL=$VITE_API_URL VITE_WS_URL=$VITE_WS_URL npx vite build

# Stage 2: Build server
FROM node:22-alpine AS server-build
RUN npm install -g pnpm
WORKDIR /app/server
COPY server/package.json server/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY server/ .
RUN npx prisma generate
RUN pnpm build

# Stage 3: Production
FROM node:22-alpine
WORKDIR /app

COPY --from=server-build /app/server/dist ./dist
COPY --from=server-build /app/server/node_modules ./node_modules
COPY --from=server-build /app/server/prisma ./prisma
COPY --from=server-build /app/server/package.json ./
COPY --from=client-build /app/client/dist ./public

RUN mkdir -p /app/data

EXPOSE 3013 3014

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/http-server.js"]
