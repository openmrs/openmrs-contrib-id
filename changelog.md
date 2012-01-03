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
