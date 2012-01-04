OpenMRS ID 
=========

User signup and self-service application for managing OpenMRS ID. Connects with an LDAP server to store user data. Built on [Node](https://github.com/joyent/node).

##Installing:

0. Built/tested with Node version 4.10 (support for recent versions soon, hopefully)

1. Install Dependencies:

        npm install express connect log4js ejs nodemailer recaptcha connect-mysql-session

2. Build node-LDAP (modern version at [jeremycx/node-LDAP](https://github.com/jeremycx/node-LDAP))

        cd node-LDAP/
        node-waf configure
        node-waf build

3. Configure Dashboard in app/conf.js

4. Run `start.sh` (alternatively, `node app/app.js`)

##To do:
###Soon:
- implement function.call to better preserve scope in validation methods
- update to node 0.6.x
- grow the "pages" system into a full-fledged renderer
	- add to configuration: sidebar options, display in navBar
	
###Future:
- (possibly) rewrite to use [ldap.js](https://github.com/mcavage/node-ldapjs) as it appears to have become the dominant Node LDAP library
- DB integration and Admin panel (ITSM-1704)
- anti-spam footer in dashboard emails
- for mailing lists:
    - build table of Google Groups data and 
    - group invitation policy: invite can only come from dashboard, must be invited to post
- Google Apps
    - have LDAP password changes propagate to google apps
- include OpenMRS Code of Conduct (ITSM-1852)


##License:
Licensed under the [OpenMRS Public License](http://license.openmrs.org) version 1.1
