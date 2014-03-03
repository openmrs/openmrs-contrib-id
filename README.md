SSO for OpenMRS ID
========

Provides single-sign-on endpoints for the [OpenMRS ID Dashboard][1].

Installation:



    git clone https://github.com/elliottwilliams/openmrs-contrib-id-sso.git
    # Within app/user-modules directory of OpenMRS ID

    cd openmrs-contrib-id-sso

    npm install
    # Install module dependencies

    vim ../../conf.js
    # Add "openmrs-contrib-id-sso" to list of user-modules

To-do:

* Desk.com implementation -- OpenMRS Helpdesk
* OpenID Connect implementation -- Module Repository

Recent changes:

* Discourse SSO implementation -- OpenMRS Talk


[1]: https://github.com/openmrs/openmrs-contrib-id