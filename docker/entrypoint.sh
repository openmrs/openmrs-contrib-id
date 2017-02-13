#!/bin/sh
set -e


# allow the container to be started with `--user`
if [[ "$1" == dockerize ]] && [ "$(id -u)" = '0' ]; then
		chown -R dashboard:dashboard /opt/id/app/user-modules/openmrs-contrib-id-globalnavbar/data/
	  exec gosu dashboard "$BASH_SOURCE" "$@"
fi
exec "$@"
