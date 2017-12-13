Migration from 2.0.x is easy. This guide will walk you through the process.

# MySQL

2.1 removes any dependencies on MySQL, currently only used for the IPWhiteList, which has been moved to mongodb.

# Configuration file migration for 2.0.1
**Line numbers are relative to the currently deployed configuration file with all sensitive data removed.**

The format changed, we refactored a lot to make it the design saner.

You will need to make the following changes.

* **Delete** Line 71-75 which should be the following:

```javascript
        "db": {
            "dbname": "id_dashboard",
            "username": "openmrsid",
            "password": "omrsid"
            },
```

* **Delete** Lines 90-95 , which should be the following:


```javascript
        "groups": {
            "__comment2": "Google Groups settings",
            // hourly
            "syncInterval": 3600000
        },

```


* **Delete** Lines 112 and 113



```javascript
     "forceUniquePrimaryEmail": true,
     "forceUniqueSecondaryEmail": true
```

* **Change** 125-127 to:

```javascript

 "defaultSidebar": [
        "needhelp"
        ],
```

* **Delete** lines 133-140, which should be the following:

```javascript

    // system modules
    "systemModules": [
        "admin",
        "signup",
        "auth",
        "profile",
        "reset-pwd",
        "db-admin"
    ],

```

* **Add** a sessionException for formage
Find the following at 152-155, add a line at the end of that list so it reads like below:

```javascript
 // a exceptionlists of session middlware, use regular expressions
   "sessionExceptions": [
     /^\/globalnav($|\/.*$)/,
     /^\/resource\/.*$/,
    /^\/panel($|\/.*$)/, // session will contradict with formage's
   ],

```

* Finally **add** the following which will correspond be line 157-181:

```javascript
"signup": {
    "signupFieldNames": [
        "username",
        "firstName",
        "lastName",
        "primaryEmail",
        "password",
        "timestamp"
    ],
    "requiredSubmitTimeSec": 5,
    "signupFormMaxAgeHours": 12,
    "honeypotFieldName": "country",
    "disableHoneypot": true,
    "disableBlacklist": true,

    "dnsSpamLists": {
        "bl.spamcop.net": {
            "returnCodes": ["127.0.0.2"]
        },
        "zen.spamhaus.org": {
            "returnCodes": ["127.0.0.2", "127.0.0.3", "127.0.0.4", "127.0.0.5",
                            "127.0.0.6", "127.0.0.7"]
        }
    }
  }
```

# IP WhiteList Removal

Due to the fact that the IP blacklist was reporting false positives all the time and did little to prevent spammers, we are disabling it by default. See this [talk post](https://talk.openmrs.org/t/proposing-to-remove-ip-blacklist-in-dashboard/2264) for details. The final configuration file change does this.

Given to the reason above, we added a field, `conf.signup.disableBlacklist` in the `app/conf.js` file, and all you need is to turn that on. The old database can be safely trashed.

# Update Dashboard dependencies

* **Delete** `node_modules`
* **Run** `npm install`

# Update User Modules

Do `git pull --rebase origin master` on each user module and also backup and delete `node_modules` and then run `npm install`

# Changes in modules for 2.1

## openmrs-contrib-id-sso

In `conf.json` add the following entry to conf.json:

2.1 automatically creates the discourse account after accounts are validated.

Add “nonceURL” below the entry for the “secret.”

The remainder of `conf.json` is be the same.

Below line 5 in add the following:

```json
"nonceURL": "http://talk.openmrs.org/session/sso",
```

## Global Nav Bar

To be written later.
