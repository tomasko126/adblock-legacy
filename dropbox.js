// Dropbox class manages sync of settings, filter lists, custom filters and excluded filters
var Dropbox = function() {};

// Initialize Dropbox
Dropbox.prototype.init = function(args, callback) {
    this._id = args.id;
    this._redirectURI = encodeURIComponent(args.redirectURI);
    var that = this;
    this.getToken(function(token) {
        if (token) {
            that._token = token;
            callback();
        }
    });
}

// AUTHENTICATION

// Log in to Dropbox
Dropbox.prototype.login = function(callback) {
    var that = this;
    var url = "https://www.dropbox.com/1/oauth2/authorize?response_type=token&client_id=" +
        this._id + "&redirect_uri=" + this._redirectURI + "&force_reapprove=true"; //remove force reapprove
    chrome.tabs.create({
        url: url
    }, function() {
        var listener = function(tabId, changeInfo, tab) {
            if (changeInfo.status === "complete" &&
                parseUri(tab.url).origin + parseUri(tab.url).pathname === decodeURIComponent(that._redirectURI)) {
                // We got right URL, now process data
                var hash = parseUri(tab.url).hash;
                if (hash.split("=")[2] === "access_denied") {
                    if (callback) {
                        callback({status: "denied"});
                    }
                } else {
                    // Parse access token and save it securely
                    var token = that.parseToken(tab.url);
                    that.saveToken(token);
                    if (callback) {
                        callback({status: "ok"});
                    }
                    // Remove listener
                    chrome.tabs.onUpdated.removeListener(listener);
                }
            }
        }
        chrome.tabs.onUpdated.addListener(listener);
    });
}

// Log out from Dropbox
Dropbox.prototype.logout = function(callback) {
    this._token = null;
    this.removeToken(function() {
       callback(); 
    });
}

// Returns true, when user is authenticated
Dropbox.prototype.isAuthenticated = function() {
    return this._token ? true : false;
}


// GET/SAVE/PARSE TOKEN

// Retrieve token from storage
Dropbox.prototype.getToken = function(callback) {
    if (!callback) {
        throw new Error("No callback specified!");
    }
    chrome.storage.local.get("dropbox_token", function(storage) {
        callback(storage.dropbox_token);
    });
}

// Save token to storage
Dropbox.prototype.saveToken = function(token) {
    chrome.storage.local.set({
        dropbox_token: token
    });
    this._token = token;
}

// Parse token from given URL
Dropbox.prototype.parseToken = function(url) {
    var token = url.split("#");
    token = token[1].split("&");
    token = token[0].split("=");
    token = token[1];
    return token;
}

// Remove token from storage
Dropbox.prototype.removeToken = function(callback) {
    chrome.storage.local.remove("dropbox_token", function() {
        if (callback) {
            callback();
        }
    });
}

// FILE functions

// Write file to Dropbox
Dropbox.prototype.writeFile = function(data, callback) {
    var that = this;
    $.ajax({
        method: "POST",
        url: "https://content.dropboxapi.com/2-beta-2/files/upload",
        data: data.data,
        beforeSend: function(request) {
            var header = data.header;
            request.setRequestHeader("Authorization", " Bearer " + that._token);
            request.setRequestHeader("Content-Type", "application/octet-stream");
            request.setRequestHeader("Dropbox-API-Arg", JSON.stringify(header));
        },
        success: function(info) {
            if (callback) {
                callback({status: "success", data: info});
            }
        },
        error: function(info) {
            if (callback) {
                callback({status: "error", data: info});
            }
        }
    });
}

// Get file from Dropbox
Dropbox.prototype.getFile = function(data, callback) {
    var that = this;
    $.ajax({
        method: "POST",
        url: "https://content.dropboxapi.com/2-beta-2/files/download",
        beforeSend: function(request) {
            var header = data.header;
            request.setRequestHeader("Authorization", " Bearer " + that._token);
            request.setRequestHeader("Dropbox-API-Arg", JSON.stringify(header));
        },
        success: function(info) {
            if (callback) {
                callback({status: "success", data: info});
            }
        },
        error: function(info) {
            if (callback) {
                callback({status: "error", data: info});
            }
        }
    });
}

// Get metadata of requested file
Dropbox.prototype.getMetadata = function(data, callback) {
    var that = this;
    $.ajax({
        method: "POST",
        url: "https://api.dropboxapi.com/2-beta-2/files/get_metadata",
        data: JSON.stringify(data),
        beforeSend: function(request) {
            request.setRequestHeader("Authorization", " Bearer " + that._token);
            request.setRequestHeader("Content-Type", "application/json");
        },
        success: function(info) {
            if (callback) {
                callback({status: "success", data: info});
            }
        },
        error: function(info) {
            if (callback) {
                callback({status: "error", data: info});
            }
        }
    });
}