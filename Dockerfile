# ─────────────────────────────────────────────
# Stage 1: Builder – native Module kompilieren
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Build-Tools nur im Builder-Stage
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# native Module für aktuelle Plattform kompilieren
RUN npm rebuild better-sqlite3

# ─────────────────────────────────────────────
# Stage 2: Production – minimales Image
# ─────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# Sicherheit: non-root User
RUN addgroup -S jobradar && adduser -S jobradar -G jobradar

# Nur das Nötigste aus dem Builder übernehmen
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=jobradar:jobradar . .

# Datenverzeichnis mit korrekten Rechten
RUN mkdir -p data && chown jobradar:jobradar data

USER jobradar

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/index.js"]
