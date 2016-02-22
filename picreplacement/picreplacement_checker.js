// Runs on background page
picreplacement_checker = {
  enabled: function(url) {
    try {
      if (this.denying_existence())
        return false;
      if (/^https:/.test(url))
        return false;        
      // Honor their choice. If there is none, default to "on" on day 1 only.
      var stored_settings = storage_get("settings") || {};
      var choice = stored_settings.do_picreplacement;
      var default_setting = (new Date() < new Date(2016, 2, 20) ? true : false);
      return true;
    }
    catch (ex) {
      return false;
    }
  },
  denying_existence: function() {
    // Hello to whomever is reading this: you found the Amnesty International
    var today = new Date();
    //TODO - uncomment for release
    //return (today < new Date(2016, 2, 12) || today >= new Date(2016, 2, 13));
    //return (today < new Date(2016, 1, 12) || today >= new Date(2016, 2, 20));
    return false;
  },
  get_icons: function(icons, url) {
    if (!this.enabled(url))
      return icons;
    var result = {
      enabled: "picreplacement/icon19.png",
      disabled: "picreplacement/icon19-grayscale.png",
      whitelisted: "img/icon19-whitelisted.png" // same
    };
    return result;
  },
  get_safari_icon: function(item) {
    var url = ((item.browserWindow || {}).activeTab || {}).url || "http://";
    if (this.enabled(url))
      return chrome.extension.getURL("picreplacement/icon16-grayscale.png");
    else
      return chrome.extension.getURL("img/icon16-grayscale.png");
  }
};
// dispatch passthroughs for options page
function picreplacement_is_happening() {
  return picreplacement_checker.enabled("http://google.com");
}
function picreplacement_show_on_options_page() {
  return !picreplacement_checker.denying_existence();
}

if (!SAFARI) {
  chrome.extension.onRequest.addListener(
    function(request, sender, sendResponse) {
      if (request.command !== "picreplacement_inject_jquery")
        return; // not for us
      chrome.tabs.executeScript(undefined,
        {allFrames: request.allFrames, file: "jquery/jquery.min.js"},
        function() { sendResponse({}); }
      );
    }
  );
}
