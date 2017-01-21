OpenMRS ID
=========
[[![Build Status](https://travis-ci.org/openmrs/openmrs-contrib-id.svg)](https://travis-ci.org/openmrs/openmrs-contrib-id) ![Code Climate](https://codeclimate.com/github/openmrs/openmrs-contrib-id/badges/gpa.svg)](https://codeclimate.com/github/openmrs/openmrs-contrib-id)
[![Dependencies Status](https://david-dm.org/openmrs/openmrs-contrib-id/status.svg)](https://david-dm.org/openmrs/openmrs-contrib-id)
[![devDependencies Status](https://david-dm.org/openmrs/openmrs-contrib-id/dev-status.svg)](https://david-dm.org/openmrs/openmrs-contrib-id?type=dev)
 [![OpenMRS Talk](https://omrs-shields.psbrandt.io/custom/openmrs/talk/F26522?logo=openmrs)](http://talk.openmrs.org/c/projects/id-dashboard)
 [![OpenMRS IRC](https://img.shields.io/badge/openmrs-irc-EEA616.svg?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MTIiIGhlaWdodD0iNjEyIiB2aWV3Qm94PSIwIDAgNjEyIDYxMiI%2BPHBhdGggZD0iTTE1MyAyMjkuNWMtMjEuMTMzIDAtMzguMjUgMTcuMTE3LTM4LjI1IDM4LjI1UzEzMS44NjcgMzA2IDE1MyAzMDZjMjEuMTE0IDAgMzguMjUtMTcuMTE3IDM4LjI1LTM4LjI1UzE3NC4xMzMgMjI5LjUgMTUzIDIyOS41em0xNTMgMGMtMjEuMTMzIDAtMzguMjUgMTcuMTE3LTM4LjI1IDM4LjI1UzI4NC44NjcgMzA2IDMwNiAzMDZjMjEuMTE0IDAgMzguMjUtMTcuMTE3IDM4LjI1LTM4LjI1UzMyNy4xMzMgMjI5LjUgMzA2IDIyOS41em0xNTMgMGMtMjEuMTMzIDAtMzguMjUgMTcuMTE3LTM4LjI1IDM4LjI1UzQzNy44NjcgMzA2IDQ1OSAzMDZzMzguMjUtMTcuMTE3IDM4LjI1LTM4LjI1UzQ4MC4xMzMgMjI5LjUgNDU5IDIyOS41ek0zMDYgMEMxMzcuMDEyIDAgMCAxMTkuODc1IDAgMjY3Ljc1YzAgODQuNTE0IDQ0Ljg0OCAxNTkuNzUgMTE0Ljc1IDIwOC44MjZWNjEybDEzNC4wNDctODEuMzRjMTguNTUyIDMuMDYyIDM3LjYzOCA0Ljg0IDU3LjIwMyA0Ljg0IDE2OS4wMDggMCAzMDYtMTE5Ljg3NSAzMDYtMjY3Ljc1UzQ3NS4wMDggMCAzMDYgMHptMCA0OTcuMjVjLTIyLjMzOCAwLTQzLjkxLTIuNi02NC42NDMtNy4wMmwtOTAuMDQgNTQuMTI0IDEuMjA0LTg4LjdDODMuNSA0MTQuMTMzIDM4LjI1IDM0NS41MTMgMzguMjUgMjY3Ljc1YzAtMTI2Ljc0IDExOS44NzUtMjI5LjUgMjY3Ljc1LTIyOS41czI2Ny43NSAxMDIuNzYgMjY3Ljc1IDIyOS41UzQ1My44NzUgNDk3LjI1IDMwNiA0OTcuMjV6IiBmaWxsPSIjZmZmIi8%2BPC9zdmc%2B)](http://irc.openmrs.org)
 [![OpenMRS Telegram](https://img.shields.io/badge/openmrs-telegram-009384.svg?logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNDAgMjQwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIuNjY3IiB5MT0iLjE2NyIgeDI9Ii40MTciIHkyPSIuNzUiPjxzdG9wIHN0b3AtY29sb3I9IiMzN2FlZTIiIG9mZnNldD0iMCIvPjxzdG9wIHN0b3AtY29sb3I9IiMxZTk2YzgiIG9mZnNldD0iMSIvPjwvbGluZWFyR3JhZGllbnQ%2BPGxpbmVhckdyYWRpZW50IGlkPSJiIiB4MT0iLjY2IiB5MT0iLjQzNyIgeDI9Ii44NTEiIHkyPSIuODAyIj48c3RvcCBzdG9wLWNvbG9yPSIjZWZmN2ZjIiBvZmZzZXQ9IjAiLz48c3RvcCBzdG9wLWNvbG9yPSIjZmZmIiBvZmZzZXQ9IjEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48Y2lyY2xlIGN4PSIxMjAiIGN5PSIxMjAiIHI9IjEyMCIgZmlsbD0idXJsKCNhKSIvPjxwYXRoIGZpbGw9IiNjOGRhZWEiIGQ9Ik05OCAxNzVjLTMuODg4IDAtMy4yMjctMS40NjgtNC41NjgtNS4xN0w4MiAxMzIuMjA3IDE3MCA4MCIvPjxwYXRoIGZpbGw9IiNhOWM5ZGQiIGQ9Ik05OCAxNzVjMyAwIDQuMzI1LTEuMzcyIDYtM2wxNi0xNS41NTgtMTkuOTU4LTEyLjAzNSIvPjxwYXRoIGZpbGw9InVybCgjYikiIGQ9Ik0xMDAuMDQgMTQ0LjQxbDQ4LjM2IDM1LjczYzUuNTIgMy4wNDQgOS41IDEuNDY3IDEwLjg3Ni01LjEyNGwxOS42ODUtOTIuNzYzYzIuMDE2LTguMDgtMy4wOC0xMS43NDYtOC4zNTgtOS4zNWwtMTE1LjU5IDQ0LjU3MmMtNy44OSAzLjE2NS03Ljg0NCA3LjU2Ny0xLjQ0IDkuNTI4bDI5LjY2NCA5LjI2IDY4LjY3My00My4zMjZjMy4yNC0xLjk2NiA2LjIxNy0uOTEgMy43NzUgMS4yNTgiLz48L3N2Zz4%3D)](https://telegram.me/openmrs)

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

* Node.js version <=5; it is known to work with 0.12+ as well.
* LDAP directory (tested with OpenLDAP), additionally supporting extensible objects and password policies
* MongoDB database
* SMTP access

##License:
Licensed under [MPL 2.0 HD](http://license.openmrs.org)
