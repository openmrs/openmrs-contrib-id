#!/usr/bin/env bash

# install openldap
set -ex

cd `dirname $0`

DEBIAN_FRONTEND=noninteractive sudo -E apt-get update -y
DEBIAN_FRONTEND=noninteractive sudo -E apt-get install -y slapd ldap-utils

sudo /etc/init.d/slapd stop

sudo rm -rf /etc/ldap/slapd.d
sudo cp -v ./slapd.conf /etc/ldap/
sudo mv -v /var/lib/ldap/DB_CONFIG ./DB_CONFIG
sudo rm -rf /var/lib/ldap/*
sudo mv -v ./DB_CONFIG /var/lib/ldap/

sudo slapadd -l ./openmrs_ldap_base.ldif
sudo slapadd -l ./groups-20140702.ldif

sudo chown openldap.openldap /etc/ldap/slapd.conf
sudo chown -R openldap.openldap /var/lib/ldap

sudo /etc/init.d/slapd start

ldappasswd -x -w secret -D cn=admin,dc=openmrs,dc=org -s secret \
    uid=omrsid,ou=system,dc=openmrs,dc=org
