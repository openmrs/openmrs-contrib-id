// exposes common ID Dashboard components to make them easier to define

// allow any other module to include Common (sorry for using a global!)
global.__commonModule = __filename;

/*
CORE COMPONENTS
===============
*/

// load the modules (one at a time)
exports.conf          = require('./conf');
exports.logger        = require('./logger');
exports.db            = require('./db');
exports.app           = require('./app');
exports.verification  = require('./email-verification');
exports.ldap          = require('./ldap');
exports.userNav       = require('./user-nav');
exports.mid           = require('./express-middleware');
exports.renderHelpers = require('./render-helpers');
exports.utils         = require('./utils');
exports.validate      = require('./validate');
exports.environment   = require('./environment');


/*
MODULES
=======
*/

// modules should define themselves at Common.module
exports.module = {};
