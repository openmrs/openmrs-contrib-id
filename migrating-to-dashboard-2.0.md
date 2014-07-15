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

    And modify the `conf.js` to reflect the change. Under `exports.mongo`, the uri should be like this, `mongodb://localhost/yourDB`

3.  Update dependencies

    rm -rf node_modules
    npm install

That's it
