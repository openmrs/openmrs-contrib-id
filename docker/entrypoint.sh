#!/bin/sh
set -e


# allow the container to be started with `--user`
if [[ "$1" == npm ]] && [ "$(id -u)" = '0' ]; then
    chown -R dashboard:dashboard /opt/id/app/user-modules/openmrs-contrib-id-globalnavbar/data/
    chown -R dashboard:dashboard /opt/id/logs
    exec gosu dashboard "$BASH_SOURCE" "$@"
fi
exec "$@"
