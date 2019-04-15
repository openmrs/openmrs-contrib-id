#!/bin/bash

USER_ID=${LOCAL_USER_ID:-65500}
echo "Adding dashboard user with uid/gid $USER_ID..."
addgroup dashboard -g "$USER_ID"
adduser -s /bin/bash -D -G dashboard -u "$USER_ID" dashboard

echo "Changing ownership to dashboard user for $WORKDIR..."
chown -R dashboard:dashboard "$WORKDIR"

echo "Creating Dashboard configuration file from example file.."
gosu dashboard cp -a app/conf.example.js app/conf.js

echo "Setting file permissions for globalnavbar data directory..."
chown -R dashboard:dashboard app/user-modules/openmrs-contrib-id-globalnavbar/data/

echo "Copying example SSO module configuration..."
gosu dashboard cp -a app/user-modules/openmrs-contrib-id-sso/conf.example.js app/user-modules/openmrs-contrib-id-sso/conf.js

echo "Installing all dependencies for all user-modules"
gosu dashboard bash -c "cd app/user-modules/openmrs-contrib-id-globalnavbar/ && yarn"
gosu dashboard bash -c "cd app/user-modules/openmrs-contrib-id-sso/ && yarn"

echo "Installing dashboard dependencies..."
gosu dashboard bash -c "yarn"

echo "Done building."
