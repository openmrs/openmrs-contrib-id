Installing OpenMRS ID
=====

(The following steps are written for and tested on Ubuntu 13.10 & 14.04 & 12.04)

1. Install and configure OpenLDAP by [following this guide][0].

2. Install a MongoDB server and configure it:

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

3. Install Node. For development environments, I use [nvm][1]. Install the latest from the Node 0.12.x tree:

     ```
     curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.26.0/install.sh | bash

     # Restart your terminal session
     nvm install v0.12
     ```

     You may experience problems that reports "No command 'nvm' nvm found...", there might be some problem happened to your bash configuration files. Usually it's easy to solve this by just adding this line to your '.bashrc'.

     ```
     [[ -s $HOME/.nvm/nvm.sh ]] && . $HOME/.nvm/nvm.sh
     ```

4. Clone [openmrs-contrib-id][2] and enter the project directory.


    ```
    git clone https://github.com/openmrs/openmrs-contrib-id.git
    cd openmrs-contrib-id
    ```



5.  Install project dependencies.

    Run this and wait:

    ```
    npm install
    
    ```

6. Copy `app/conf.example.js` to `app/conf.js`. Edit `conf.js` and modify configuration with:

    1. LDAP credentials for the `omrsid` account
    2. LDAP resource uri's (e.g. replace `dc=example` with `dc=openmrs,dc=org`)
    3. MongoDB database name and credentials
    4. Postfix mail sending credentials and port
    5. reCAPTCHA keys (if you have them—they are required for signup)

    In addition, remove the items in the `user-modules` array. Modules need to be manually downloaded and placed in the `app/user-modules` directory.

7. Initialize `Groups` in MongoDB
    
    There is a helper script borrowed from [here][6] for this.
    Simply run
    ```
    node build/store.js
    ```

    See details in Addtional Notes 2.

8. Start OpenMRS ID in development mode from the base project directory:

    ```
    node app/app
    ```


### Addtional Notes

1. For development purpose, it's not necessary to install and play the Postfix mailer. You may take a look of the [Mailcatcher][5], which is a ruby application that catches all the emails sent from local server.

2. You may have noticed that we used groups to manage privileges. Due to historical reasons we stored our user data in 2 copies, one in LDAP, the other in the MongoDB. Before you create your first user, you shall initialize the Group collection in MongoDB as well. We've built [OpenMRS-ID-Migrator][6] for this. This toolset would help you sync OpenLDAP with MongoDB.

    Also, if you want to access the admin panel, you must have an account in admin groups. However, the first admin account could only be added programmatically. To ease your mind, there is also a tool in this repo.

    The `add-admin.js` helper is now copied into `scripts/add-admin.js`, check `scripts/ADDING-ADMIN.md` for its usage.
    


[0]: https://gist.github.com/elliottwilliams/9548288
[1]: https://github.com/creationix/nvm
[2]: https://github.com/openmrs/openmrs-contrib-id
[3]: http://docs.mongodb.org/manual/tutorial/install-mongodb-on-ubuntu/
[5]: http://mailcatcher.me/
[6]: https://github.com/Plypy/OpenMRS-ID-Migrator
