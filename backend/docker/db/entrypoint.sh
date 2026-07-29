#!/bin/sh
set -e

if [ -s "$PGDATA/PG_VERSION" ]; then
    echo "host all all 0.0.0.0/0 trust" >> "$PGDATA/pg_hba.conf"
    echo "host all all ::/0 trust" >> "$PGDATA/pg_hba.conf"
fi

exec /usr/local/bin/docker-entrypoint.sh "$@"
