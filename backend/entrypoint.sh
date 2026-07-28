#!/bin/sh
set -e

# Ensure uploads directory exists with correct ownership
mkdir -p /app/uploads
chown app:app /app/uploads

# Drop to app user and start Node
exec su-exec app node dist/server.js
