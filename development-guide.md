Development Instructions of Dashboard
===

Dashboard is a typical [Node.js][1] web application that utilizes [Express.js][0] framework.

### Running this

#### Install dependencies

``` shell
$ npm install
```

#### Start the services (OpenLDAP, MongoDB and mailcatcher)

``` shell
$ docker-compose up -d
```

#### Add groups to MongoDB
If this is the first time you are running this, you need to add the groups to mongo. Simply run the following helper script:

``` shell
$ docker-compose exec web node build/store.js
```

#### Run the development server

So long as `web` container is running, no need to do anything. You might need to restart it periodically, do so by:

``` shell
$ docker-compose up --force-recreate web
```

### Key Packages
As you may know, a Node.js application depends heavily on the modules it uses, you may take a took in `package.json`.

Here are some important ones,

+ [Express.js][0], The framework we are using.
    Currently, we are using the Express4.
+ [Mongoose][3], The mongodb object modeling tool.
+ [Async.js][2], As all I/O operations in Node.js all asynchronous, we use the Async.js module to control the asynchronous workflow.
+ [Lo-Dash][5], Node.js utility library.
+ [Formage][6], Mongoose monitoring tools.
+ [Mocha](http://mochajs.org), [Chai](http://chaijs.com/), Packages that used for testing.

### Project Structure
Currently, we organize the code this way.

```
/.                          where all documentation and scripts lie
--/app                      all basic funtional source files
----/app/models             where all Mongoose model lies
----/app/routes             where the routers are defined
----/app/user-modules       optional add-ons which adds additional functionality
--/templates                view templates
--/logs                     the log files
--/resource                 static resources
--/tests                     tests should reside here.
```
**Note**
+ You'd better use corresponding structure between `app/routes` and `templates/views`.
+ For modules, you may refer to existing modules, like [openmrs-contrib-id-oauth](https://github.com/openmrs/openmrs-contrib-id-oauth).

### Testing
The testing files are under `tests` folder. If you want to run it, first you should add a `conf.js` under this folder. Currently it only holds a `mongoURI` attribute to specify the testing database, we advise you to use a different one from the normal database, in order to prevent it from being messed up. However, in the part that testing synchronization with OpenLDAP, we are using the same database as production. So be careful with that. If you have any ideas how to improve this, please make a PR.

To run the test, type `npm test` which would call `tests/runner`.

*Caveat*: You may have noticed that some tests requires `app/logger`. We did a patch for `log4js`, which adds a `addLogger` method to it. In order to require modules that used `log4js`, you need to require the source to make the patch available.

### Development Rules
Whatever by the design or due to history, we have some implicit rules.

+ Code style, we are following the [Felix's](http://nodeguide.com/style.html). You should follow it in most cases. However, remember it's not like the absolute laws that you cannot violate, it's just a guideline.

+ Globals are bad and other stuff that would create strong coupling.

+ Routes structure, we tend to split different logic of routes into different files. You may refer details in the project.

+ Please use feature branches and try to keep your PRs to one commit, check out our [development guide][7] for more information on how to do that.

+ For issue tracking purposes, please open a corresponding issue for a pull request, [here](http://issues.openmrs.org/browse/ID)

+ Comments, it's a good habit to constantly add explanatory comments. When a part of logic is too long, and when some code is complicated, just add few comments. And for some functions that maybe used externally, you may add full [JSDoc](http://en.wikipedia.org/wiki/JSDoc).


### Helpful Tools

For keeping a good code style and prevent possible pitfalls, [JSHint](http://www.jshint.com/) is highly recommended.


[0]: http://expressjs.com/
[1]: http://nodejs.org/
[2]: https://github.com/caolan/async
[3]: http://mongoosejs.com/
[5]: http://lodash.com/
[6]: https://github.com/TheNodeILs/formage
[7]: http://en.flossmanuals.net/openmrs-developers-guide/development-process/
