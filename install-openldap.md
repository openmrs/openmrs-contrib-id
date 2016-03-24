Configuring OpenLDAP for OpenMRS ID
=====
# Vagrant Box

I set up a vagrant box which basically does everything below. It is now included – simply type:

      ``` shell
      $ vagrant up
      ```
and ldap will be ready to use. This guide is pretty much deprecated now.


## Script install
**Caveat**: This script will set naive passwords for LDAP. You'd better use this for development only, or change the password later.

You can use [build/install-openldap.sh](https://github.com/openmrs/openmrs-contrib-id/blob/master/build/install-openldap.sh) to install and configure OpenLDAP. Basically, it will perform the commands listed in "Manually install" section.

The script will use [build/slapd.conf](https://github.com/openmrs/openmrs-contrib-id/blob/master/build/slapd.conf), which specifies root user as `cn=admin,dc=openmrs,dc=org` with password `secret`, to configure OpenLDAP and set the password of system user `uid=omrsid,ou=system,dc=openmrs,dc=org` as `secret`. You may check the script for further details.

## Manually install

Purpose of this document: To document how to configure [OpenLDAP][4] for a development environment of [OpenMRS ID][5]. OpenMRS ID requires other components (nodejs environment, a postfix server to connect to), but OpenLDAP is easily the most complicated to configure.

Installing
-----

Install OpenLDAP. On Ubuntu, this is two packages:

- `slapd` - the LDAP server daemon
- `ldap-utils` - LDAP management utilities

Preparing
-----

Once installed, you'll need to create a `slapd.conf` file (config file for the ldap server). Working off of my [config file][1] ([direct link][3]), you should verify the included directories exist and adjust the root password. Move this file to `/etc/ldap`, and delete the `/etc/ldap/slapd.d` directory (this config file overrides it).

You will also need to create a directory to store the LDAP database. Use `/var/lib/ldap`, which is required by some versions of OpenLDAP, and is already specified in my `slapd.conf`. Be sure to set its owner as the "openldap" system user, since LDAP needs runtime readwrite access to it:

    sudo mkdir -p /var/lib/ldap
    sudo chown openldap:openldap /var/lib/ldap

Next you need to load the LDAP directory structure into place. I've packaged it into two LDIF files, placed under `build` as `openmrs_ldap_base.ldif` and `groups-201tom40702.ldif`. Download both files, shut down slapd (`service slapd stop`), and run

    sudo slapadd -l openmrs_ldap_base.ldif
    sudo slapadd -l groups-20140702.ldif

For each of the above commands, a successful import will look like this:
    
    #################### 100.00% eta   none elapsed            none fast! 
    
    

Okay! At this point you should be able to run slapd. If `service slapd start` fails, run `sudo slapd -d 1 -f /etc/ldap/slapd.conf`, which will run slapd in the foreground. Usually there's a line or path in the config file that's wrong. It's also worth checking that your data directory (/var/lib/ldap in my config) is owned by openldap:openldap

Next, you'll need to set passwords for the OpenMRS ID system account. The (ridiculously verbose) command to do this is:

    ldappasswd -x -W -D cn=admin,dc=openmrs,dc=org -S \
        uid=omrsid,ou=system,dc=openmrs,dc=org

You will be prompted first for the password you are setting (omrsid's password), then for the new password to be re-entered, then for your root password as specified in `slapd.conf`. The default root password is **secret**.

At this point, LDAP changes can be reflected in the dashboard's `conf.js`. Any `dc=example` property should be re-written to `dc=openmrs,dc=org`, and you'll need to include the LDAP credentials you set for uid=omrsid,ou=system,dc=openmrs,dc=org.

---

At this point, LDAP should be set for development on OpenMRS ID. This document is a work-in-progress. If you would like to suggest changes, you're welcome to! Please contact me at elliott@openmrs.org or elliott_w on irc.freenode.net if you've got any questions.


[1]: https://github.com/openmrs/openmrs-contrib-id/blob/master/build/slapd.conf
[3]: https://raw.githubusercontent.com/openmrs/openmrs-contrib-id/master/build/slapd.conf
[4]: http://www.openldap.org/
[5]: https://github.com/openmrs/openmrs-contrib-id
