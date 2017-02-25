module.exports = {
    // valid JSON
    "strategies": {

        "discourse": {
            "secret": process.env.DISCOURSE_SECRET,
            "nonceURL": process.env.DISCOURSE_NONCE_URL,
            "returnURL": process.env.DISCOURSE_RETURN_URL,
        },
        "deskcom": {
            "apiKey": process.env.DESKCOM_API_KEY,
            "siteKey": process.env.DESKCOM_SITE_KEY,
            "expiry": process.env.DESKCOM_EXPIRY,
            "returnURL": process.env.DESKCOM_RETURN_URL,
        },
        "atlas": {
            "apiKey": process.env.ATLAS_API_KEY,
            "siteKey": process.env.ATLAS_SITE_KEY,
            "expiry": process.env.ATLAS_EXPIRY,
            "returnURL": process.env.ATLAS_RETURN_URL,
        },

    },
};