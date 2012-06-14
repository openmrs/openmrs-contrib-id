var LDAP = require('LDAP');
var ldap = new LDAP({uri: 'ldap://localhost', version: 3});

/*
console.log(ldap);
console.log(ldap.getStats());
*/

function testSearch(){
	ldap.search({
			base: 'ou=users,dc=openmrs,dc=org',
			scope: 2,
			filter: '(uid=elliott)',
			attrs: 'uid cn sn'
		}, function(err, data){
			if (err) console.log('fail');//throw (err);
			else console.log(data);
			console.log(ldap.getStats());
		});
}
			
ldap.open(function(err){

	if (err) throw(err);
	ldap.simplebind({
		binddn: 'uid=elliott,ou=users,dc=openmrs,dc=org',
		password: 'the-cake-is-a-lie'
		}, function(err){
			if (err) throw (err);
			/*
ldap.search({
				base: 'ou=users,dc=openmrs,dc=org',
				scope: 2,
				filter: '(uid=elliott)',
				attrs: 'uid cn sn'
			}, function(err, data){
				if (err) throw (err);
				else console.log(data);
			});
*/
			testSearch();
			setTimeout(testSearch, 15000);			
		});
});