# this is incredibly basic but should handle starting OpenLDAP, MongoDB, and mailcatcher for you.
#!/bin/bash

parts start openldap
parts start mongodb
mailcatcher --http-ip 0.0.0.0 --http-port 4000
