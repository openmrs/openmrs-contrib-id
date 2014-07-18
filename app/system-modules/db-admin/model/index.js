var path = require('path');
var fs = require('fs');
var files = fs.readdirSync(__dirname);

files.forEach(function(file) {
  var name = path.basename(file, '.js');
  if (name === 'index') {
    return;
  }

  var mod = require('./' + name);
  if (mod.model) {
    module.exports[name] = mod;
  }
});
