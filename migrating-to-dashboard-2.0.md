In addition to the oringinal installing guide. You need to do these,

1.  Install MongoDB, just follow the [official guide](http://docs.mongodb.org/manual/tutorial/install-mongodb-on-ubuntu/).

2.  Then create users in Mongo
    
    Connect to mongo

        mongo admin

    Create the root user

        db.createUser( {
            user: 'userNameHere',
            pwd: 'passwordHere',
            roles: [
                { role: 'root', db: 'admin'}
            ]
        })

    You can check the user by `db.auth('username', 'password')`

    Switch to the db you want

        use yourDB

    Then create the user dashboard needs

        db.createUser( {
            user: 'userNameHere',
            pwd: 'passwordHere',
            roles: [
                { role: 'readWrite', db: 'yourDB'}
            ]
        })

    And modify the old `conf.js` to reflect the change. You shoulde add an `exports.mongo`

    It should be like this, like the one in `conf.exmaple.js`

    ```javascript
    "mongo": {
      "uri": "mongodb://localhost/id_dashboard",
      "username": "mongo_user",
      "password": "secret",
      "commonExpireTime": "2d"
    },
    ```

3.  Update dependencies

    rm -rf node_modules
    npm install

4.  Migrate the data from the older dashboard
    
    See this [guide](https://github.com/Plypy/openmrs-contrib-id/blob/new-db/migrating-to-dashboard-2.0.md).

    Be careful this script is very rudimentary, so you'd better exactly follow the guide.

That's it
