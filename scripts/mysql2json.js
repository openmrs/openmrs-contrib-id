// Taken from https://gist.github.com/karmadude/1445992#gistcomment-1332042
var mysql = require('mysql');
var fs = require('fs');

var connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'mysqlrootpass' // change this to your root password!
});

connection.connect();

connection.query('select * from id_dashboard.IPWhitelists;', function(err, results, fields) {
  if(err) throw err;

  fs.writeFile('ipwhitelist.json', JSON.stringify(results), function (err) {
    if (err) throw err;
    console.log('Saved!');
  });

  connection.end();
});
