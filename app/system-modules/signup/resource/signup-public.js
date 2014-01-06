(function() {
    this.disguise = function scrambleFields(name, spin) {
        var text = name + SPINNER;
        var hash = CryptoJS.MD5(text);
        return hash.toString(CryptoJS.enc.hex);
    }
})()