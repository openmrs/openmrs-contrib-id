openmrs-navbar
==============

Global navigation bar across [OpenMRS](http://openmrs.org) Community. A module of [OpenMRS ID](https://github.com/downeym/OpenMRS-ID).

##Design Goals

- blend with any OpenMRS UI
	- Wiki (dark header)
	- JIRA (white header)
	- Answers (blue header)
	- WP / ID (light warm header)

- serve from a central location
	- ID (integrate as a module)
		- fast (Node)
		- hooked into ID system (eventual profile integration)
		- modification process
			- for link changes, needs to be built into ID administration
			- for code changes, needs commit

- modifyable from OpenMRS ID
	- stored in OpenMRS ID system DB
	- link titles & URLs configurable

- more than just a list of links
	- global announcement bar
	- display notifications/tips relating to a specific tool (e.g. promote new features, account changes, etc.)
	- future: integrate with the greater OpenMRS ID profile, integrate into login session

- integrated into client page
	- one ``<script> `` tag necessary to load, in any part of the page
	- prepend the body with navbar HTML, with permissions to:
		- execute scripts
		- change the URL of the parent page (preferably without JS)
