OpenMRS ID Quick Setup
======================

Hello, and thanks for hacking on OpenMRS ID!

Please run the following command in the console at the bottom of your screen
to finish setting up your Nitrous environment:

    bash ./workspace/openmrs-contrib-id/nitrous/bootstrap.sh

Once completed, you can start and stop OpenMRS by changing to the
`~/workspace/openmrs-contrib-id` directory and running

    node app/app

Use the Preview menu -> Port 3000 to access the Dashboard. Press CTRL-C in your
console to shut down the Dashboard.

If you restart your Nitrous box, run the following commands to start up the
services OpenMRS ID depends on:

    parts start openldap
    parts start mongodb
    mailcatcher --http-ip 0.0.0.0 --http-port 4000

I have added a script to do the above and it can be executed by running:

    bash ~/workspace/openmrs-contrib-id/nitrous/startservices.sh
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
