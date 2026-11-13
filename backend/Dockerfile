# ==============================================================================
# AeroFleet Backend Dockerfile (Node.js 20 LTS Alpine)
# ==============================================================================
FROM node:20-alpine AS base

# Install security updates
RUN apk update && apk upgrade --no-cache

WORKDIR /app

# Set production environment
# PORT is intentionally NOT hardcoded here — Render injects it automatically.
# Falls back to 5001 for local Docker Compose runs.
ENV NODE_ENV=production

# Copy package descriptors first to leverage Docker layer caching
COPY package.json package-lock.json ./

# Install only production dependencies reproducibly
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source code (data/catalogue.json included)
COPY . .

# Ensure files are owned by unprivileged node user
RUN chown -R node:node /app

# Run as non-root user for enhanced container security
USER node

# Expose backend REST API & Socket.IO port (Render overrides with $PORT)
EXPOSE 5001

# Native Node.js healthcheck — uses $PORT so it works on both Render and Docker
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const http = require('http'); const p = process.env.PORT || 5001; http.get('http://127.0.0.1:' + p + '/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1));"

# Launch the Express + Socket.IO server
CMD ["node", "server.js"]
