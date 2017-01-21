Installing OpenMRS ID
=====

(The following steps are written for and tested on Ubuntu (almost all versions))

1. Install and configure OpenLDAP by [following this guide][0]. There currently exists a [vagrant][] box which will set up openldap for you using puppet.

    ``` shell
    $ vagrant up
    ```

    It by  default listens on port `1389`.
    Authentication details:

          | User Name | Password | Purpose                |
          |-----------|----------|------------------------|
          | omrsid    | secret   | ID Dashboard Account   |
          | admin     | secret   | Administrative Account |

it listens on port `1389` on on `**127.0.0.1**`.

2. Run our mongodb [docker][] container by using [docker-compose][], which will create the database for you – as well as the user and handle everything for you. Simply type: type:

    ``` shell
    $ docker-compose up mongodb -d

          | Database  |
          |-----------|
          | openmrsid |

It listens on port `**27018**` on `**127.0.0.1**`. The current example config should be useable for development purposes, but do not use it for production purposes. There is no password.

3. Install Node. For development environments, I use [nvm][1]. Install the latest from the Node 5.x branch (**It does not work with Node 6**, we test against 0.12.x, 4.x and 5.x on travis-ci):

     ```
     curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.26.0/install.sh | bash

     # Restart your terminal session
     nvm install 5
     ```

     You may experience problems that reports "No command 'nvm' nvm found...", there might be some problem happened to your bash configuration files. Usually it's easy to solve this by just adding this line to your '.bashrc'.

     ```
     [[ -s $HOME/.nvm/nvm.sh ]] && . $HOME/.nvm/nvm.sh
     ```

4. Clone [openmrs-contrib-id][2] and enter the project directory.


    ```
    git clone --recursive https://github.com/openmrs/openmrs-contrib-id.git
    cd openmrs-contrib-id
    ```

5.  Install project dependencies.

    Run this and wait:

    ```
    npm install ; git submodule foreach npm install

    ```

6. Copy `app/conf.example.js` to `app/conf.js`. Edit `conf.js` and modify configuration with:

    1. LDAP credentials for the `omrsid` account
    2. LDAP resource uri's (e.g. replace `dc=example` with `dc=openmrs,dc=org`)
    3. reCAPTCHA keys (if you have them—they are required for signup)
    4. Set up SMTP credentials



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
### Setting up Modules

1. Global Navigation Bar

`cp -a app/user-modules/openmrs-contrib-id-globalnavbar/lib/db.example.json app/user-modules/openmrs-contrib-id-globalnavbar/lib/db.json`

2. Single Sign On
`cp -a app/user-modules/openmrs-contrib-id-sso/conf.example.js app/user-modules/openmrs-contrib-id-sso/conf.js`



### Addtional Notes

1. For development purpose, it's not necessary to install and play the Postfix mailer. You may take a look of the [Mailcatcher][5], which is a ruby application that catches all the emails sent from local server. The current [docker][] container handles spinning this up for you.

2. You may have noticed that we used groups to manage privileges. Due to historical reasons we stored our user data in 2 copies, one in LDAP, the other in the MongoDB. Before you create your first user, you shall initialize the Group collection in MongoDB as well. We've built [OpenMRS-ID-Migrator][6] for this. This toolset would help you sync OpenLDAP with MongoDB.

    Also, if you want to access the admin panel, you must have an account in admin groups. However, the first admin account could only be added programmatically. To ease your mind, there is also a tool in this repo.

    The `add-admin.js` helper is now copied into `scripts/add-admin.js`, check `scripts/ADDING-ADMIN.md` for its usage.



[0]: https://gist.github.com/elliottwilliams/9548288
[1]: https://github.com/creationix/nvm
[2]: https://github.com/openmrs/openmrs-contrib-id
[5]: http://mailcatcher.me/
[6]: https://github.com/Plypy/OpenMRS-ID-Migrator
[docker]:https://docs.docker.com/engine/installation/
[docker-compose]: https://docs.docker.com/compose/install/
[vagrant]: https://www.vagrantup.com/downloads.html
