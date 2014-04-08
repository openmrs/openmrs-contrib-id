var Common = require(global.__commonModule)

Common.module.sso = require('./lib/sso')

// Load strategies
require('./lib/discourse')
require('./lib/deskcom')