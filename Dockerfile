FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
# npm ci garantiert reproduzierbare Builds (exakt wie package-lock.json)
RUN npm ci --omit=dev --no-audit --no-fund
COPY . .
RUN mkdir -p data
# Non-root User fuer sichereren Betrieb
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && chown -R appuser:appgroup /app
USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "src/index.js"]
