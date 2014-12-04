#!/bin/bash

# OPENMRS ID NITROUS BOOTSTRAP

cd ~
mkdir ~/tmp

## INSTALL OPENLDAP

echo
echo "  We need to checkout a version of the Nitrous dependency manager from "
echo "  GitHub. Please answer 'yes' to the following prompt."
echo

cd ~/.parts/autoparts
git remote add elliott https://github.com/elliottwilliams/autoparts.git
git fetch elliott openldap -q
git checkout elliott/openldap -q

cd ~

echo 
echo "  We will now install OpenLDAP. This may take a long time, and you will"
echo "  see lots of output on your terminal. Be patient!"
echo 
echo "  Press any key to continue, or CTRL-C to abort the installation."
read

parts install openldap

## SET UP GIT
cd ~/workspace/openmrs-contrib-id
git init .
git remote add origin https://github.com/elliottwilliams/openmrs-contrib-id.git
git fetch origin master
git checkout -f master
#git fetch origin nitrous
#git checkout -f nitrous

## CONFIGURE OPENLDAP

echo
echo "  Now fetching prebuilt LDAP configuration for OpenMRS ID."
echo

cd ~/.parts/packages/openldap/2.4.39/
mkdir -p var/lib/ldap
mkdir -p var/run/slapd
mkdir tmp
cd tmp

# Download prebuilt config
cd ~/workspace/openmrs-contrib-id/nitrous
cp slapd-premade.conf ../etc/openldap/slapd.conf

# Download prebuilt dataset     
cd ~/workspace/openmrs-contrib-id/nitrous
slapadd -l ldap-premade.ldif

# Start openldap, cross fingers
parts start openldap

echo
echo "  OpenLDAP configured and started successfully."
echo

## SET UP MYSQL
#cd ~
#echo
#echo "  Now installing and configuring MySQL."
#echo
#parts install mysql
#parts start mysql

#mysqladmin -u root create id_dashboard 


## SET UP MONGODB
cd ~
echo
echo "  Now installing and configuring MongoDB."
echo
parts install mongodb
parts start mongodb
mongo id_dashboard ~/workspace/openmrs-contrib-id/nitrous/mongo-setup.js

## INSTALL uuid.h
echo
echo "  Installing libuuid"
echo
cd ~/tmp
cp ~/workspace/openmrs-contrib-id/nitrous/libuuid-nitrous.tar.gz ~/tmp
tar -zxf libuuid-nitrous.tar.gz
cp -r libuuid/* ~/.parts/


## INSTALL NODE DEPENDENCIES
echo
echo "  Now installing Node dependencies for OpenMRS ID."
echo
cd ~/workspace/openmrs-contrib-id

# Install Dependencies
npm install --no-shrinkwrap


## COPY CONFIG
cd ~/workspace/openmrs-contrib-id
cp nitrous/conf.js app/conf.js

## INSTALL USER-MODULES
echo
echo "  Now installing OpenMRS ID modules: openmrs-contrib-id-groups, openmrs-"
echo "  contrib-id-styleguide"
echo
git clone https://github.com/openmrs/openmrs-contrib-id-groups.git ~/workspace/openmrs-contrib-id/app/user-modules/openmrs-contrib-id-groups
git clone https://github.com/elliottwilliams/openmrs-contrib-id-styleguide.git ~/workspace/openmrs-contrib-id/app/user-modules/openmrs-contrib-id-styleguide

## INSTALL MAILCATCHER
echo
echo "  Now installing Mailcatcher, which will allow you to see email messages"
echo "  sent from the ID Dashboard to any email address"
echo
gem install mailcatcher

mailcatcher --http-ip 0.0.0.0 --http-port 4000

echo
echo "  To start mailcatcher in the future, run the following command:"
echo "    $ mailcatcher --http-ip 0.0.0.0 --http-port 4000"
echo

## START OPENMRSID
echo
echo "  OpenMRS ID is all set up! To launch the app, navigate to"
echo "  ~/workspace/openmrs-contrib-id and run:"
echo
echo "    $ node app/app"
echo
echo "  Press CTRL-C to exit."

cd ~/workspace/openmrs-contrib-id
