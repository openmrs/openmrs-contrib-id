#!/bin/bash
if [ -f .bootstrapped ]; then echo "Bootstrapped...not doing anything."; exit 1; fi
if [ ! -e ./app/conf.js ]; then echo "Copying app/conf.example.js"; cp app/conf.example.js app/conf.js; fi
if [ ! -e app/user-modules/openmrs-contrib-id-sso/conf.js ]; then
    echo "Copying SSO module config"
    cp -a app/user-modules/openmrs-contrib-id-sso/conf.example.js app/user-modules/openmrs-contrib-id-sso/conf.js
fi
echo "Setting up base OpenLDAP config and database for development." && \
sudo tar xvjf build/etc_ldap_slapd.d.tbz2 -C ./data/ldap/ \
&& sudo tar xvjf build/var_lib_ldap.tbz2 -C ./data/ldap/ \
&& echo "Done." \
&& echo "Adding groups to MongoDB..." \
&& docker-compose up -d --force-recreate openldap mongodb mailcatcher \
&& node build/store.js \
&& echo "Done." \
&& touch .bootstrapped
