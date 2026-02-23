# Build stage
FROM node:22-alpine as builder

WORKDIR /build

# Copy monorepo files
COPY package.json package-lock.json ./

# Install all dependencies
RUN npm ci

# Copy all packages
COPY packages ./packages

# Build aios-lovable-mcp specifically
WORKDIR /build/packages/aios-lovable-mcp
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY packages/aios-lovable-mcp/package.json ./

# Copy node_modules from builder (already has prod dependencies)
COPY --from=builder /build/node_modules ./node_modules

# Copy built code from builder
COPY --from=builder /build/packages/aios-lovable-mcp/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S app -u 1001

USER app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start server with HTTP support (cache bust: 2026-02-22-v2)
CMD ["node", "dist/start-with-http.js"]
