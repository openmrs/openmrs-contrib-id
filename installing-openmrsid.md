Installing OpenMRS ID
=====

(The following steps are written for and tested on Ubuntu 13.10)

1. Install and configure OpenLDAP by [following this guide][0]. 

2. Install a mysql server, then create a database. This database will need to be specified in OpenMRS ID's `conf.js` later on:

    ```
    apt-get install mysql-server
    mysql -uroot
    > CREATE DATABASE id_dashboard
    > CHARACTER SET utf8
    > DEFAULT COLLATE utf8_general_ci;
    ```
    
3. Install Node. For development environments, I use [nvm][1]. Install the latest from the Node 0.8.x tree:

	 ```
     curl https://raw.githubusercontent.com/creationix/nvm/v0.6.1/install.sh | sh

     # Restart your terminal session
     nvm install v0.8
     ```
    
4. Clone [openmrs-contrib-id][2] and enter the project directory.

	```
    git clone https://github.com/openmrs/openmrs-contrib-id.git
    cd openmrs-contrib-id
    ```
    
5. Install project dependencies. This uses the `npm-shrinkwrap.json` file in the project to ensure the same dependency versions are installed that we use in production. The LDAP module we use needs to be manually built, as well.

    ```
    npm install
    ```
    
6. Build the LDAP module, which has C and libldap requirements. On Ubuntu, make sure the `build-essential`, `libldap2-dev`, and `uuid-dev` packages are installed, then run:

	```
	cd node-modules/LDAP
	node-waf configure
	node-waf build
	cd ../..
	```
    
7. Copy `app/conf.example.js` to `app/conf.js`. Edit `conf.js` and modify configuration with:

	1. LDAP credentials for the `omrsid` account
	2. LDAP resource uri's (e.g. replace `dc=example` with `dc=openmrs,dc=org`)
	3. Mysql database name and credentials
	4. Postfix mail sending credentials and port
	5. reCAPTCHA keys (if you have them—they are required for signup)
 
	In addition, remove the items in the `user-modules` array. Modules need to be manually downloaded and placed in the `app/user-modules` directory.	
	
8. Start OpenMRS ID in development mode from the base project directory:

	```
	node app/app
	```


[0]: https://gist.github.com/elliottwilliams/9548288
[1]: https://github.com/creationix/nvm
[2]: https://github.com/openmrs/openmrs-contrib-id
