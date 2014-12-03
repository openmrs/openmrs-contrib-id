OpenMRS ID Quick Setup
======================

Hello, and thanks for hacking on OpenMRS ID!

Please run the following command in the console at the bottom of your screen
to finish setting up your Nitrous environment:

    ./workspace/openmrs-contrib-id/nitrous/bootstrap.sh
    
Once completed, you can start and stop OpenMRS by changing directory to
`~/workspace/openmrs-contrib-id` and running

    node app/app
    
Use the Preview menu -> Port 3000 to access the Dashboard. Press CTRL-C in your
console to shut down the Dashboard.


Passwords
=========

- OpenMRS ID User: (use this to log in to the dashboard)
  - username: admin
  - password: admin123
- OpenLDAP system account:
  - user DN: uid=omrsid,ou=system,dc=openmrs,dc=org
  - password: omrsid
- OpenLDAP superuser:
  - user DN: cn=admin,dc=openmrs,dc=org
  - password: secret
- MySQL (database: id_dashboard):
  - username: root
  - password: (empty)
- MongoDB (database: id_dashboard):
  - username: omrsid
  - password: omrsid