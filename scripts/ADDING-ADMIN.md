If you want to add your first admin account for Dashboard, you'd better use the script `add-admin.js`, which will make your life easier.

To use that, first you need create a `add-admin.json` in this folder, which goes like below,
```json
{
    "userList": [
        "plypy"
    ],
    "groupName": "dashboard-administrators"
}
```

Having edited that, simply call `node add-admin.js`.
