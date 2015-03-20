// Check for updates
function checkupdates(callback) {
    var AdBlockVersion = chrome.runtime.getManifest().version;
    var checkURL = (SAFARI ? "https://safariadblock.com/update.plist" :
                    "https://clients2.google.com/service/update2/crx?" +
                    "x=id%3Dgighmmpiobklfepjocnamgkkbiglidom%26v%3D" +
                    AdBlockVersion + "%26uc");

    // Fetch the version check file
    $.ajax({
        cache: false,
        dataType: "xml",
        url: checkURL,
        error: function() {
            return callback({latest: undefined});
        },
        success: function(response) {
            if (!SAFARI) {
                if ($("updatecheck[status='ok'][codebase]", response).length) {
                    return callback({latest: false});
                } else {
                    return callback({latest: true});
                }
            } else {
                var version = $("key:contains(CFBundleShortVersionString) + string", response).text();
                if (isNewerVersion(version)) {
                    var updateURL = $("key:contains(URL) + string", response).text();
                    return callback({latest: false, updateURL: updateURL});
                } else {
                    return callback({latest: true});
                }
            }
        }
    });

    // Check if newVersion is newer than AdBlockVersion
    function isNewerVersion(newVersion) {
        var versionRegex = /^(\*|\d+(\.\d+){0,2}(\.\*)?)$/;
        var current = AdBlockVersion.match(versionRegex);
        var notCurrent = newVersion.match(versionRegex);
        if (!current || !notCurrent)
            return false;
        for (var i=1; i<4; i++) {
            if (current[i] < notCurrent[i])
                return true;
            if (current[i] > notCurrent[i])
                return false;
        }
        return false;
    }
};