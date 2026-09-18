# ── Stage 1: install dependencies ────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are inlined at build time — pass the browser-accessible URLs.
# Override via docker-compose build.args or --build-arg at `docker build` time.
ARG NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws/chat
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# ── Stage 3: production runner (standalone output) ────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# next.config.ts sets output:'standalone' for non-mobile builds,
# which copies everything needed into .next/standalone.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

# Runtime auth env vars (not baked in at build time — safe to pass at `docker run`)
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
