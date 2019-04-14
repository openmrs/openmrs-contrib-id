#!/bin/bash

set -eux

if [ -f .bootstrapped ]; then
    echo "Bootstrapped...not doing anything.";
    exit 1;
fi
if [ ! -e ./app/conf.js ]; then
    echo "Copying app/conf.example.js";
    cp -a app/conf.example.js app/conf.js;
fi
if [ ! -e app/user-modules/openmrs-contrib-id-sso/conf.js ]; then
    echo "Copying SSO module config"
    cp -a app/user-modules/openmrs-contrib-id-sso/conf.example.js app/user-modules/openmrs-contrib-id-sso/conf.js
fi

echo "Running yarn"
yarn
(cd app/user-modules/openmrs-contrib-id-globalnavbar && yarn)
(cd app/user-modules/openmrs-contrib-id-sso && yarn)

echo "Setting up base OpenLDAP config and database for development." && \
if [ ! -e ./data/ldap ]; then mkdir ./data/ldap; fi

echo "Adding groups to MongoDB..." \
&& tar xvjpf build/etc_ldap_slapd.d.tbz2 -C ./data/ldap/ \
&& tar xvpjf build/var_lib_ldap.tbz2 -C ./data/ldap/ \
&& echo "Done." \
&& echo "Starting openldap, mongodb and mailcatcher docker containers" \
&& docker-compose up -d --force-recreate openldap mongodb mailcatcher \
&& echo "Waiting for openldap to start" && sleep 30 \
&& node build/store.js \
&& echo "Done." \
&& touch .bootstrapped
