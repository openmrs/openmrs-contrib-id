Development Instructions of Dashboard
===

Dashboard is a typical [Node.js][1] web application that utilizes [Express.js][0] framework.

### Key Packages
As you may know, a Node.js application depends heavily on the modules it uses, you may take a took in `package.json`.

Here are some important ones,

+ [Express.js][0], The framework we are using.
    Currently, we are using the Express3, as we oringally used Express2, and some functions were lost durying the migration. We used some packages to replace the missing functionalities. Like, [EJS-locals](https://github.com/RandomEtc/ejs-locals), [connect-flash](https://github.com/jaredhanson/connect-flash).
+ [Mongoose][3], The mongodb object modeling tool.
+ [Sequelize.js][4], Package for easily communicating with MySQL.
+ [Async.js][2], As all I/O operations in Node.js all asynchronous, we use the Async.js module to do the asynchronous control flow.
+ [Lo-Dash][5], Node.js utility library.
+ [Formage][6], Mongoose monitoring tools.
+ [Mocha](http://mochajs.org), [Chai](http://chaijs.com/), Packages that used for testing.

### Project Structure
Currently, we organize the code this way.

```
/.                          where all documentation and script lies
--/app                      all basic funtional source files
----/app/model              where all Mongoose model lies
----/app/routes             basic routes files
----/app/system-modules     the system modules
----/app/user-modules       optional add-ons which adds additional functionality
--/logs                     the log files
--/resource                 static resources
--/test                     tests should reside here.
--/views                    view templates
```
**Note**: system-modules and user-modules will have a similar structure under its own tree.

### Testing
The testing files are under `test` folder. If you want to run it, first you should add a `conf.js` under this folder. Currently it only holds a `mongoURI` attribute to specify the testing database, we advise you use a separate one from the normal database, in order to prevent it from being messed up. However, in the part that testing synchronization with OpenLDAP, we are forced to use the same database as production. So be careful with that. Ultimately, we will change this, so pull requests welcome.

And the `Makefile` contains the script for running tests, you may run test easily by `make test`.

### Development Rules
Whatever by the design or due to history, we have some implicit rules.

+ Code style, we are following the [Felix's](http://nodeguide.com/style.html). You should follow it in most cases. However, remember it's not like the absolute laws that you cannot violate, it's just a guideline.

+ Global variables, for historical reason, we used a global variable `global.__commonModule` to store the path of `openmrsid-common.js`, which requires other files, and provide common share for few important instance, like the `app` object of Express.

    However, except from the convenince it brought, it may cause problems for testing and strong coupling. A suggestion is to directly require files in those functional files that might be used in other places. But you may use them in routes files.

+ Routes structure, we tend to split different logic of routes into different files. You may refer details in the project.

+ Please use feature branches and try to keep your PRs to one commit, check out our [development guide][7] for more information on how to do that.

+ For issue tracking purposes, please open a corresponding issue for a pull request, [here](http://issues.openmrs.org/browse/ID)

+ Comments, it's a good habit to constantly add explanatory comments. When a part of logic is too long, and when some code is complicated, just add few comments. And for some functions that maybe used externally, you may add full [JSDoc](http://en.wikipedia.org/wiki/JSDoc).


### Helpful Tools

For keeping a good code style, [JSHint](http://www.jshint.com/) is highly recommended, also if you want to auto beautify the code, you may use [JS-beautify](https://github.com/beautify-web/js-beautify).


[0]: http://expressjs.com/
[1]: http://nodejs.org/
[2]: https://github.com/caolan/async
[3]: http://mongoosejs.com/
[4]: http://sequelizejs.com/
[5]: http://lodash.com/
[6]: https://github.com/TheNodeILs/formage
[7]: http://en.flossmanuals.net/openmrs-developers-guide/development-process/
