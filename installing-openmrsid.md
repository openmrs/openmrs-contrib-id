Installing OpenMRS ID
=====

(The following steps are written for and tested on Ubuntu 13.10 & 14.04 & 12.04)

1. Install and configure OpenLDAP by [following this guide][0]. 

2. Install a mysql server, then create a database. This database will need to be specified in OpenMRS ID's `conf.js` later on:

    ```
    apt-get install mysql-server
    mysql -u root -p
    > CREATE DATABASE id_dashboard
    > CHARACTER SET utf8
    > DEFAULT COLLATE utf8_general_ci;
    ```

    And add a user for that database
    ```
    > CREATE USER 'username'@'localhost' IDENTIFIED BY 'some_pass';
    > GRANT ALL PRIVILEGES ON id_dashboard.* TO 'username'@'localhost' WITH GRANT OPTION;
    ```

3. Install a MongoDB server and configure it:
    
    For installation, you may just refer the [official documentation][3].
    Then,

    Turn on the auth mechanism, if you use the configuration file, modify it. By default, it should lie in '/etc/mongod.conf'. Find and uncomment this line.

    ```
    auth = true
    ```

    Connect to mongo

    ```
    mongo admin
    ```

    Create the root user

    ```
    db.createUser( {
        user: 'userNameHere',
        pwd: 'passwordHere',
        roles: [
            { role: 'root', db: 'admin'}
        ]
    })
    ```

    You can check the user by `db.auth('username', 'password')`

    Switch to the db you want,

    ```
    use yourDB
    ```

    Then create the user dashboard needs

    ```
    db.createUser( {
        user: 'userNameHere',
        pwd: 'passwordHere',
        roles: [
            { role: 'readWrite', db: 'yourDB'}
        ]
    })
    ```

    **You need to initialize the mongo as well, check the additional notes below**

4. Install Node. For development environments, I use [nvm][1]. Install the latest from the Node 0.8.x tree:

	 ```
     curl https://raw.githubusercontent.com/creationix/nvm/v0.13.1/install.sh | bash

     # Restart your terminal session
     nvm install v0.8
     ```

     You may experience problems that reports "No command 'nvm' nvm found...", there might be some problem happened to your bash configuration files. Usually it's easy to solve this by just adding this line to your '.bashrc'.
     ```
     [[ -s $HOME/.nvm/nvm.sh ]] && . $HOME/.nvm/nvm.sh
     ```

5. Clone [openmrs-contrib-id][2] and enter the project directory.

	```
    git clone https://github.com/openmrs/openmrs-contrib-id.git
    cd openmrs-contrib-id
    ```
    
6. Install project dependencies. This uses the `npm-shrinkwrap.json` file in the project to ensure the same dependency versions are installed that we use in production.

    First, the [LDAP][4] module, which has C and libldap requirements, needs few packages for building. On Ubuntu, **make sure the `build-essential`, `libldap2-dev`, and `uuid-dev` packages are installed**.

    Run this and wait.

    ```
    npm install
    ```
    
7. Copy `app/conf.example.js` to `app/conf.js`. Edit `conf.js` and modify configuration with:

	1. LDAP credentials for the `omrsid` account
	2. LDAP resource uri's (e.g. replace `dc=example` with `dc=openmrs,dc=org`)
	3. Mysql/MongoDB database name and credentials
	4. Postfix mail sending credentials and port
	5. reCAPTCHA keys (if you have them—they are required for signup)
 
	In addition, remove the items in the `user-modules` array. Modules need to be manually downloaded and placed in the `app/user-modules` directory.	
	
8. Start OpenMRS ID in development mode from the base project directory:

	```
	node app/app
	```

### Addtional Notes

1. For development purpose, it's not necessary to install and play the Postfix mailer. You may take a look of the [Mailcatcher][5], which is a ruby application that catches all the emails sent from local server.

2. You may have noticed that we used groups to manage privileges. Due to historical reasons we stored our user data in 2 copies, one in LDAP, the other in the MongoDB. Before you create your first user, you shall initialize the Group collection in MongoDB as well. Check this [repo][6]. Also, if you want to access the admin panel, you must have an account in admin groups. However, the first admin account could only be added programmatically. To ease your mind, there is also a tool in this repo.

[0]: https://gist.github.com/elliottwilliams/9548288
[1]: https://github.com/creationix/nvm
[2]: https://github.com/openmrs/openmrs-contrib-id
[3]: http://docs.mongodb.org/manual/tutorial/install-mongodb-on-ubuntu/
[4]: https://github.com/jeremycx/node-ldap
[5]: http://mailcatcher.me/
[6]: https://github.com/Plypy/OpenMRS-ID-Migrator
