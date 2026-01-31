#!/bin/sh
# =============================================================================
# Kids Job App Entrypoint Script
# =============================================================================
# This script runs when the container starts:
# 1. Fixes permissions on the data volume (needed when volume is first created)
# 2. Runs database schema push to ensure tables exist
# 3. Drops privileges from root to the kidsjob user
# 4. Starts the Node.js server
# =============================================================================

set -e

echo "=== Kids Job App Starting ==="

# Fix ownership of the data directory
# When Docker creates a volume, it's owned by root. We need to change ownership
# to our app user so it can read/write the SQLite database.
echo "Fixing data directory permissions..."
chown -R kidsjob:nodejs /app/data

# Run database schema push as the app user
# This creates/updates the database tables based on the Drizzle schema
echo "Pushing database schema..."
su-exec kidsjob:nodejs npx drizzle-kit push --force

# Start the application as the app user
echo "Starting server..."
exec su-exec kidsjob:nodejs node .output/server/index.mjs
