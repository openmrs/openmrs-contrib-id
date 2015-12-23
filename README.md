OpenMRS ID
=========
[![Code Climate](https://codeclimate.com/github/openmrs/openmrs-contrib-id/badges/gpa.svg)](https://codeclimate.com/github/openmrs/openmrs-contrib-id)
[![Build Status](https://travis-ci.org/openmrs/openmrs-contrib-id.svg)](https://travis-ci.org/openmrs/openmrs-contrib-id)


User signup and self-service web application, built for [OpenMRS](http://openmrs.org), now running at [id.openmrs.org](http://id.openmrs.org). Integrates with an LDAP server and MongoDB to store user data. Built on [Node](https://github.com/joyent/node) and [Express](https://github.com/strongloop/express/).

##Development:

Want to dig your hands in and lend a hand? Please read our [development guide](https://github.com/openmrs/openmrs-contrib-id/blob/master/development-guide.md).

##Installation:

See [`installing-openmrsid.md`](https://github.com/openmrs/openmrs-contrib-id/blob/master/installing-openmrsid.md)

##Features:

* Simple user self-service for an OpenLDAP user directory, including:
	* Signup - supporting email address verification, reCAPTCHA anti-spam forms, and welcome mail
	* User profile changes - editing first/last name, email, password; adding multiple email addresses
	* Password resets - reset by username or email address, send to all emails linked to a user
* Modular system for adding new functionality, see (Modules)[https://github.com/openmrs/openmrs-contrib-id#modules] section
* Form validation and control
* Designed with the visual style of [openmrs.org](http://openmrs.org) in mind :)

##Modules:

A few modules (providing additional functionality) have been created. They can be placed in `app/user-modules` and loaded from `conf.js`.

* [openmrs-contrib-globalnavbar](https://github.com/openmrs/openmrs-contrib-id-globalnavbar)
* ~~[openmrs-contrib-id-groups](https://github.com/openmrs/openmrs-contrib-id-groups)~~ *(***We no longer use Google Groups and now use [OpenMRS Talk](http://talk.openmrs.org) in its place -- it is provided solely for historic purposes***)*
* [openmrs-contrib-id-oauth](https://github.com/openmrs/openmrs-contrib-id-oauth) provides OAuth2.0-based authorization module for OpenMRS ID
* [openmrs-contrib-id-sso](https://github.com/openmrs/openmrs-contrib-id-sso) provides single sign on authentication strategies

##Why We Built It:
OpenMRS's developer community was in need of unification between the tools hosted at openmrs.org and elsewhere. With contributors needing separate accounts to submit code, edit the wiki, and join mailing lists (for example), the amount of user fragmentation between tools kept growing. People new to the OpenMRS community tended to be a little confused, having to manually manage profiles across very visually-disconnected sites. Ultimately, we wanted one ID, everywhere.

##Server Requirements:

* Node.js version 4.2.x; it is known to work with 0.12+ as well.
* LDAP directory (tested with OpenLDAP), additionally supporting extensible objects and password policies
* MongoDB database
* SMTP access

##License:
Licensed under [MPL 2.0 HD](http://license.openmrs.org)
