// Dropbox class manages sync of settings, filter lists, custom filters and excluded filters
// NOTICE: This library will brake, when Dropbox updates API endpoints

// TODO: When longpoll will be available in API v2 (/longpoll_delta in API v1),
//       switch to long polling instead of polling every minute

var Dropbox = function() {};

// Initialize Dropbox library
// Inputs: args (object) - contains ID of Dropbox app and redirect URI
// Callback must be specified
Dropbox.prototype.init = function(args, callback) {
    var that = this;
    if (!callback) {
        throw new Error("No callback specified!");
    }
    this._id = args.id;
    this._redirectURI = encodeURIComponent(args.redirectURI);
    this.getToken(function(token) {
        if (token) {
            that._token = token;
        }
        callback(that.isAuthenticated());
    });
}

// AUTHENTICATION

// Log in to Dropbox
// Callback is optional
Dropbox.prototype.login = function(callback) {
    var that = this;
    var url = "https://www.dropbox.com/1/oauth2/authorize?response_type=token&client_id=" +
              this._id + "&redirect_uri=" + this._redirectURI;
    // Create new tab
    chrome.tabs.create({
        url: url
    }, function() {
        var listener = function(tabId, changeInfo, tab) {
            if (changeInfo.status === "complete" &&
                parseUri(tab.url).origin + parseUri(tab.url).pathname === decodeURIComponent(that._redirectURI)) {
                // We got right URL, now process data
                var hash = parseUri(tab.url).hash;
                // Access was denied by user
                if (hash.split("=")[2] === "access_denied") {
                    if (callback) {
                        callback("denied");
                    }
                } else {
                    // Access was approved by user,
                    // now parse access token and save it
                    var token = that.parseToken(tab.url);
                    that.saveToken(token);
                    if (callback) {
                        callback("ok");
                    }
                    // Remove tab listener
                    chrome.tabs.onUpdated.removeListener(listener);
                }
            }
        }
        chrome.tabs.onUpdated.addListener(listener);
    });
}

// Log out from Dropbox
// Callback is optional
Dropbox.prototype.logout = function(callback) {
    this.removeToken(function() {
       if (callback)
           callback(); 
    });
}

// Returns true, when user is authenticated
Dropbox.prototype.isAuthenticated = function() {
    return this._token ? true : false;
}


// GET/SAVE/PARSE TOKEN

// Retrieve token from storage
// Callback must be specified
Dropbox.prototype.getToken = function(callback) {
    if (!callback) {
        throw new Error("No callback specified!");
    }
    chrome.storage.local.get("dropbox_token", function(storage) {
        callback(storage.dropbox_token);
    });
}

// Save token to storage
// Input: token (string) - a token which will be saved
// for later use of API calls
Dropbox.prototype.saveToken = function(token) {
    chrome.storage.local.set({
        dropbox_token: token
    });
    this._token = token;
}

// Parse token from given URL
// Input: url (string) - an URL, which should be processed
Dropbox.prototype.parseToken = function(url) {
    var token = url.split("#");
    token = token[1].split("&");
    token = token[0].split("=");
    token = token[1];
    return token;
}

// Remove token from storage
// Callback is optional
Dropbox.prototype.removeToken = function(callback) {
    var that = this;
    chrome.storage.local.remove("dropbox_token", function() {
        that._token = null;
        if (callback) {
            callback();
        }
    });
}

// FILE functions

// Write or update file on Dropbox
// Input: data (object):
//          header (object): |path| to the file, which should be created or updated
//                           |mode| string - optional
//                           |mute| bool - optional   
// Callback is optional
Dropbox.prototype._writeOrUpdateFile = function(data, callback) {
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
// Callback is optional
Dropbox.prototype._getFile = function(data, callback) {
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

// POLLING

// Get delta cursor of folder
// Callback is optional
Dropbox.prototype._getCursor = function(data, callback) {
    var that = this;
    $.ajax({
        method: "POST",
        url: "https://api.dropboxapi.com/2-beta-2/files/list_folder",
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

// Poll for file changes on Dropbox
// Callback is optional
Dropbox.prototype._pollForChanges = function(data, callback) {
    var that = this;
    $.ajax({
        method: "POST",
        url: "https://api.dropboxapi.com/2-beta-2/files/list_folder/continue",
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