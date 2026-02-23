# ============================================================
# AIOS Lovable MCP - Simplified Build (No Workspace Issues)
# Build timestamp: 2026-02-23T07:05:00Z - Force rebuild
# ============================================================

# Stage 1: Build dependencies in isolation
FROM node:22-alpine as builder

WORKDIR /workspace

# Copy root package files
COPY package.json package-lock.json ./
RUN npm install --prefer-offline --no-audit

# Copy source files
COPY packages/aios-lovable-mcp ./packages/aios-lovable-mcp

# Install workspace package and build
WORKDIR /workspace/packages/aios-lovable-mcp
RUN npm install --prefer-offline --no-audit && npm run build

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

# Install dumb-init
RUN apk add --no-cache dumb-init

# Copy package files from aios-lovable-mcp
COPY packages/aios-lovable-mcp/package*.json ./

# Install production dependencies only (not dev dependencies)
RUN npm install --production --prefer-offline --no-audit

# Copy built files
COPY --from=builder /workspace/packages/aios-lovable-mcp/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S app -u 1001
USER app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Entrypoint (force PORT=3000 to override Railway defaults)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/start-with-http.js"]
ENV PORT=3000
ENV NODE_ENV=production
