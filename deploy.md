ID Dashboard Deployment
======================

###Installing:
(assuming LDAP server is up and running, and a MySQL database to hold session data has been created)

Clone the git repo:

    git clone git@github.com:openmrs/OpenMRS-ID.git
    
Duplicate conf.example.js and fill in unique settings & server auth data:

	cd OpenMRS-ID/app
	cp conf.example.js conf.js
	vim conf.js
	
Start, optionally as a different user:

	cd ../ (now in ./OpenMRS-ID)
	sudo -u node ./start.sh
	
Check logs to ensure it all works	

ID Dashboard logs at ./logs/openmrsid.log and runs its webserver at port 3000
