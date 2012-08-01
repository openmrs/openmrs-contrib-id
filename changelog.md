ID DASHBOARD VERSION 1.4.0
===============

* New: System design change: modularization (!)
	* New features will now be implemented as modules
	* Will greatly simplify development
	* Dashboard comes bundled with mandatory system modules, user-installed modules (non-essential features) available
	* Modules are designed to:
		* Render pages and register routes
		* Register & store data in unique MySQL tables
		* Plug into user-navigation bar and admin panel
	* Currently available modules:
		* openmrs-contrib-dashboard-groups (moved to a standalone module since 1.3.1)
		* openmrs-contrib-globalnav
	* Core features (signup, profile, login/logout) in process of becoming system modules
* New: Admin panel
	* Built to organize module configuration
	* Designed to store data in DB (although really any storage model could be used)
	* Restricted to usergroup "dashboard-administrators"
	* Core Dashboard configuration not (yet) ported over, still found in conf.js


ID DASHBOARD VERSION 1.3.1
===============

* New feature: Google Groups
	* Users can subscribe to mailing lists from within dashboard
	* Email address, not username tied to subscription
		* Users see subscriptions they made before signing up for an ID
	* Utilizes Google Apps Provisioning API
* Profile email address verification
	* benefits from email-verification system introduced in 1.3.0
	* community email address trust now at 100% - any new email address entered will be verified

ID DASHBOARD VERSION 1.3.0
===============
(released on id.openmrs.org June 2012)

* New: MySQL database model
	* Using Sequelize.js
	* Dashboard now able to store data outisde of LDAP entries
	* Easily extensible
* New: Email verification subsystem
	* Replaces custom code for password resets
	* Used to validate email addresses on signup, and available for any future developments
* Anti-spam fixes
	* Fixed an issue where signup captcha could be bypassed by manually modifying POST to signup URL
	* Possible future: Implement an anti-spam honeypot to further control spam
* Migration to Node v0.6.x tree (from v0.4.x)
	* nearly all libraries updated, notable stability improvements in node-LDAP

ID DASHBOARD VERSION 1.2
===============

###Dashboard Changes:
- new UI to match wordpress (ITSM-2195)
- form validation changes:
	- validation expression changed for email (ITSM-2171)
	- email addresses now checked for uniqueness
		- only checked against other primary addresses and not secondaries due to limitations in LDAP schema
	- form validation now only checks fields that have been changed
		- for example, email addresses will not be validated unless they are being modified
- "undefined" bug on login fixed (ITSM-2138)
- unhandled email bug on password reset fixed (ITSM-1659 & ITSM-1827)
- ITSM-1666 changes implemented
- password changes always prompt twice for password (ITSM-1643)
- session data now stored in MySQL table (partially in response to ITSM-2205)


ID DASHBOARD VERSION 1.1
===============

###Dashboard Changes
- new: secondary email addresses
    - stored as otherMailbox attribute in ldap server
    - unlimited number
    - managed at /edit/profile in javascript-driven multi-field
- form validation
    - now a piece of middleware, any field can tie into the validator
    - standard routine to mark failed fields and display failtext
- validation changes
    - primary email uniqueness
- edit profile view
    - displays username
    - form validation
    - tab view between profile editing and password changes
    - tabs are linkable
- general UI changes
    - new css3 buttons (ITSM-1765)
    - shows labels rather than placeholders
        - w3c standard, and fixes IE problems
    - displays username next to real name by profile banner
    - extended use of flash messages, now both "info" and "error" types
    - login view now uses standard layout
    - shows a sidebar entry with link to Crowd for members of "crowd-administrators" group on the root page
- server changes
    - proper shutdown scripts
    - writes to a pid file on startup
- bug fixes:
    - pop-down login no longer rendered when logged in, to prevent scripts from logging in over a logged in user
    - catches more login failures
    - various IE quirks fixed
    
    
###LDAP Changes
- user now extensibleObject, allows full schema of classes on user classes such as otherMailbox
