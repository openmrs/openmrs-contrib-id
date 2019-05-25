#!/bin/bash

set -eux

docker-compose down -v

rm -rf data/ldap
rm -rf data/mongo

rm .bootstrapped
