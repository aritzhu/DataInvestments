#!/bin/sh
set -e

# Ensure uploads directory exists with correct ownership
mkdir -p /app/uploads
chown app:app /app/uploads

# If a command is passed (run --rm / exec), execute it instead
if [ $# -gt 0 ]; then
  exec su-exec app "$@"
fi

exec su-exec app node dist/server.js
