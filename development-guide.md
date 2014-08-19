Development Instructions of Dashboard
===

Dashboard is a typical [Node.js][1] web application that utilizes [Express.js][0] framework.

### Key Packages
As you may know, a Node.js application depends heavily on the modules it uses, you may take a took in `package.json`.

Here are some important ones,

+ [Express.js][0], The framework we are using.
+ [Mongoose][3], The mongodb object modeling tool.
+ [Sequelize.js][4], Package for easily communicating with MySQL.
+ [Async.js][2], As all I/O operations in Node.js all asynchronous, we use the Async.js module to do the asynchronous control flow.
+ [Lo-Dash][5], Node.js utility library.
+ [Formage][6], Mongoose monitoring tools.

### Project Structure
Currently, we organize the code this way.

/.                          where all documentation and script lies
--/app                      all basic funtional source files
----/app/model              where all Mongoose model lies
----/app/routes             basic routes files
----/app/system-modules     the system modules
----/app/user-modules       optional function add-ons
--/logs                     the log files
--/resoure                  static web resouce
--/test                     all test source files
--/views                    webpage templates

Also, for any specifc system-module/user-module, it will have alike sub-structure, you may take a deep look yourself.


[0]: http://expressjs.com/
[1]: http://nodejs.org/
[2]: https://github.com/caolan/async
[3]: http://mongoosejs.com/
[4]: http://sequelizejs.com/
[5]: http://lodash.com/
