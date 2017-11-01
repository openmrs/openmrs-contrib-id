Installing OpenMRS ID
=====

This guide is written and tested on Linux and should be compatible with any Unix-based system.

<!-- markdown-toc start - Don't edit this section. Run M-x markdown-toc-generate-toc again -->
**Table of Contents**

- [Installing OpenMRS ID](#installing-openmrs-id)
    - [Install Node.](#install-node)
    - [Install Docker and Docker Compose](#install-docker-and-docker-compose)
    - [Clone OpenMRS ID Dashboard](#clone-openmrs-id-dashboard)
    - [Running ID Dashboard](#running-id-dashboard)
        - [Development](#development)
            - [Using Docker](#using-docker)
            - [Running Locally](#running-locally)
        - [Production](#production)
            - [Copy OpenLDAP database and config directories to be read by the docker container.](#copy-openldap-database-and-config-directories-to-be-read-by-the-docker-container)
            - [Load Production data into the new MongoDB container](#load-production-data-into-the-new-mongodb-container)
    - [Services](#services)
        - [Setting up OpenLDAP](#setting-up-openldap)
            - [Authentication details:](#authentication-details)
        - [Setting up MongoDB](#setting-up-mongodb)
        - [Setting up Mailcatcher](#setting-up-mailcatcher)
    - [Additional Notes](#additional-notes)

<!-- markdown-toc end -->


## Install Node.

We suggest you use [nvm][1].

Install the latest from the Node 6.x branch (**It does not work with Node 7**)

``` shell
$ curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.26.0/install.sh | bash

# Restart your terminal session
$ nvm install 6
```

You may experience problems that reports "No command 'nvm' nvm found...", there might be some problem happened to your bash configuration files. Usually it's easy to solve this by just adding this line to your '.bashrc'.

``` shell
[[ -s $HOME/.nvm/nvm.sh ]] && . $HOME/.nvm/nvm.sh
```

## Install Docker and Docker Compose

We use Docker and Docker Compose for everything. First step is to install it. Follow the instructions
for your operating system.

1. Install [docker][]
2. Install [docker-compose][]

## Clone OpenMRS ID Dashboard

Clone [openmrs-contrib-id][2] and enter the project directory.
``` shell
$ git clone --recursive https://github.com/openmrs/openmrs-contrib-id.git && cd openmrs-contrib-id
```

## Running ID Dashboard

The example configuration has been set up to run either inside of docker, or locally on the host with the services running in docker.

### Development

In order to setup the development environment, we have a bootstrap script. It will bootstrap a basic LDAP configuration, initialize `Groups` in MongoDB(see section on [setting it up](#setting-up-mongodb).  See details in [Additional Notes](#additional-notes) item 2), and copy over example configurations.


Subsequent runs will simply not run. It places a file named `.bootstrapped` in the project's root, which is ignored by git.

#### Using Docker

``` shell
$ ./build/bootstrap.sh
$ docker-compose up -d web
```

#### Running Locally

**You must [install yarn][], since [bower][] has been pushing people to [migrate away from bower][]. We now use [yarn][] to manage [bower][] dependencies.**

``` shell
$ ./build/bootstrap.sh
$ node app/app
```

You should be able to see the app running on `localhost:3000`


### Production

Copy `.env.example` to `.env`.
Ensure all production secrets are in `.env`. All services are set up to listen on `127.0.0.1`.

If moving from 2.0.x, bring down OpenLDAP and copy the data directories:

#### Copy OpenLDAP database and config directories to be read by the docker container.
``` shell
$ cp /var/lib/ldap -R data/ldap/database
$ cp /etc/ldap/slapd.d -R data/ldap/config
```

#### Load Production data into the new MongoDB container

This can be done while mongo is running, but you should bring down ID dashboard.

1. Run mongodump:

``` shell
$ mongodump -u username -p password -d openmrsid
```
2. Then do the following:

``` shell
$ docker-compose -f docker-compose-prod.yml up -d
$ docker cp dump/openmrsid id_dashboard_mongo:/openmrsid
$ docker-compose exec mongodb mongorestore --db openmrsid --drop openmrsid
```

## Services
### Setting up OpenLDAP

1. You will need to extract `build/var_lib_ldap.tbz` and `build/etc_ldap_slapd.d.tbz2` to `data/ldap`. This contains the basic
   OpenLDAP configuration and database to get started. If you ever need to restart, simply repeat the commands listed below.
The following is for **DEVELOPMENT ONLY**:

``` shell
$ tar xvjf build/etc_ldap_slapd.d.tbz2 -C data/ldap
$ tar xvjf build/var_lib_ldap.tbz2 -C data/ldap
```
It by  default listens on port `389`.

#### Authentication details:

| User Name | Password | Purpose                |
|-----------|----------|------------------------|
| omrsid    | secret   | ID Dashboard Account   |
| admin     | secret   | Administrative Account |


It listens on port `389` on on `127.0.0.1`.

Starting it is the same for both production and development:

``` shell
docker-compose up -d openldap
```
### Setting up MongoDB

Run our mongodb [docker][] container by using [docker-compose][], which will create the database for you – as well as the user and handle everything for you. Simply type:

``` shell
$ docker-compose up mongodb -d
```
### Setting up Mailcatcher

For development purpose, it's not necessary to install and play the Postfix mailer. You may take a look of the [Mailcatcher][5], which is a ruby application that catches all the emails sent from local server. The current [docker][] container handles spinning this up for you.

``` shell
docker-compose up -d mailcatcher
```
The web interface is available on port **1080** on all interfaces and the SMTP server listens on port **1025** on all interfaces.

No special configuration is necessary.

## Additional Notes

1. For development purpose, it's not necessary to install and play the Postfix mailer. You may take a look of the [Mailcatcher][5], which is a ruby application that catches all the emails sent from local server. The current [docker][] container handles spinning this up for you.

2. You may have noticed that we used groups to manage privileges. Due to historical reasons we stored our user data in 2 copies, one in LDAP, the other in the MongoDB. Before you create your first user, you shall initialize the Group collection in MongoDB as well. We've built [OpenMRS-ID-Migrator][6] for this. This toolset would help you sync OpenLDAP with MongoDB.

    Also, if you want to access the admin panel, you must have an account in admin groups. However, the first admin account could only be added programmatically. To ease your mind, there is also a tool in this repo.

    The `add-admin.js` helper is now copied into `scripts/add-admin.js`, check `scripts/ADDING-ADMIN.md` for its usage.

[1]: https://github.com/creationix/nvm
[2]: https://github.com/openmrs/openmrs-contrib-id
[5]: http://mailcatcher.me/
[6]: https://github.com/Plypy/OpenMRS-ID-Migrator
[docker]:https://docs.docker.com/engine/installation/
[docker-compose]: https://docs.docker.com/compose/install/
[install yarn]: https://yarnpkg.com/lang/en/docs/install/
[yarn]: https://yarnpkg.com/
[migrate away from bower]: https://bower.io/blog/2017/how-to-migrate-away-from-bower/
[bower]: https://bower.io
