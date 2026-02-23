# Build stage
FROM node:22-alpine as builder

WORKDIR /build

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY src ./src
COPY tsconfig.json ./

# Build
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built code from builder
COPY --from=builder /build/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S app -u 1001

USER app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start both MCP server and HTTP server
CMD ["node", "dist/start-with-http.js"]
