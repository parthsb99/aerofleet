# ==============================================================================
# AeroFleet Frontend Dockerfile (Multi-Stage Build: Node.js 20 + Nginx Alpine)
# ==============================================================================

# ── Stage 1: Build Vite Production Assets ─────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies required for Vite build)
RUN npm ci

# Copy frontend source code and static assets
COPY . .

# Build the optimized production SPA into /app/dist
RUN npm run build

# ── Stage 2: Production Nginx Server ──────────────────────────────────────────
FROM nginx:1.27-alpine

# Remove default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx configuration (SPA routing, WebSocket proxy, caching)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Healthcheck testing the Nginx server status
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/health || exit 1

# Start Nginx in foreground mode
CMD ["nginx", "-g", "daemon off;"]
