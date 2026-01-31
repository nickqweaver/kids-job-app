# =============================================================================
# Kids Job App Dockerfile
# =============================================================================
# This Dockerfile builds and runs a TanStack Start application with better-sqlite3.
#
# Why Node 22 Alpine?
# - Alpine is a minimal Linux distribution (~5MB), keeping our image small
# - Node 22 is the current LTS version with best performance
# - Alpine requires extra steps for native modules (like better-sqlite3)
#
# Why multi-stage build?
# - Stage 1 (builder): Installs ALL dependencies and builds the app
# - Stage 2 (runner): Only copies what's needed to run, keeping image small
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder

# Install build dependencies required for native Node modules (better-sqlite3)
# - python3: Required by node-gyp to compile native addons
# - make, g++: C++ compiler toolchain for native modules
# - sqlite-dev: SQLite development headers for better-sqlite3
RUN apk add --no-cache python3 make g++ sqlite-dev

WORKDIR /app

# Copy package files first (Docker layer caching optimization)
# If package.json hasn't changed, Docker reuses the cached npm install layer
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDependencies needed for build)
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Build the application
# This creates the .output directory with the production server
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Production Runner
# -----------------------------------------------------------------------------
FROM node:22-alpine AS runner

# Install runtime dependencies for better-sqlite3
# - sqlite-libs: SQLite shared libraries needed at runtime
# - libstdc++: C++ standard library (required by native modules)
# - su-exec: Lightweight tool to drop from root to non-root user (like gosu)
RUN apk add --no-cache sqlite-libs libstdc++ su-exec

WORKDIR /app

# Create a non-root user for security
# Running as root in containers is a security risk
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 kidsjob

# Create the data directory for SQLite database
# This will be mounted as a volume to persist data
RUN mkdir -p /app/data && chown kidsjob:nodejs /app/data

# Copy only what's needed from the builder stage
# - .output: The compiled production server
# - drizzle: Database migrations (if they exist)
# - drizzle.config.ts + schema: Required by drizzle-kit push command
# - package.json: For npm scripts
# - node_modules: Runtime dependencies (better-sqlite3 native bindings)
COPY --from=builder --chown=kidsjob:nodejs /app/.output ./.output
COPY --from=builder --chown=kidsjob:nodejs /app/drizzle.config.ts ./
COPY --from=builder --chown=kidsjob:nodejs /app/src/db/schema.ts ./src/db/
COPY --from=builder --chown=kidsjob:nodejs /app/package.json ./
COPY --from=builder --chown=kidsjob:nodejs /app/node_modules ./node_modules

# Copy entrypoint script and make it executable
COPY --chown=kidsjob:nodejs entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Note: We start as root so entrypoint.sh can fix volume permissions,
# then it drops to the kidsjob user via su-exec for security.

# Expose the application port
EXPOSE 3000

# Set default environment variables
# DATABASE_URL points to the mounted volume location
ENV NODE_ENV=production
ENV DATABASE_URL=/app/data/kidsjob.db

# Start the application via entrypoint script
# The script runs migrations first, then starts the server
CMD ["./entrypoint.sh"]
