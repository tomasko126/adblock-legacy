// If history.pushState is available, YouTube uses the history API
// when navigation from one video to another, and tells the flash player with JavaScript
// which video and which ads to show next, bypassing our flashvars rewrite code.
// So we disable history.pushState on pages with YouTube's flash player,
// this will for the site to use to a page reload.
if (/youtube/.test(document.location.hostname)) {
  if (!SAFARI) {
    window.onload = function() {
      document.location.href = "javascript:void(history.pushState = undefined);";
    }
  // Onload event is fired differently in Safari,
  // so we have to check whether the page has been completely loaded
  // or not by using readyState event.
  } else {
    var disable_history_api = setInterval(function() {
      if (/loaded|complete/.test(document.readyState)) {
        clearInterval(disable_history_api);
        document.location.href = "javascript:void(history.pushState = undefined);";
      }
    }, 50);
  }
};

// In Safari when clicking from one video to another,
// users can see loading of the next page and 
// then the reload of the already chosen page.
// This prevents users to see this behaviour.
window.onbeforeunload = function() {
  if (SAFARI)
  document.body.style.display = "none";
}

// Get enabled settings
var enabled_settings = [];
BGcall("get_settings", function(settings) {
  for (setting in settings) {
    if (settings[setting]) {
      enabled_settings.push(setting);
    }
  }
  // If YouTube whitelist is enabled in Options, add name of the channel on the end of URL
  if (enabled_settings.indexOf("youtube_channel_whitelist") >= 0) {
    if (/youtube/.test(document.location.hostname)) {
      // Don't run on main, search and feed page
      var address = document.location.href;
      if ((/user|watch|channel/.test(document.location.href)) && address.search("feed") < 0 && address.search("&channel") < 0) {
        // Find name of the channel and puts it at the end of the URL.
        // On the end will be "&channel=xyz", where "xyz" is a name of the channel,
        // so we are able to whitelist the YouTube channel with the easiest way
        var url = document.location.href;
        // Grab name of the channel
        if (/user|channel/.test(document.location.href)) {
          var get_yt_name = document.getElementsByClassName("qualified-channel-title")[0].innerText;
          var extracted_name = get_yt_name.replace(/\s/g, '');
          var new_url = url+"?&channel="+extracted_name;
        } else {
          try {
            var get_yt_name = document.getElementsByClassName("yt-user-name")[0].innerText || document.getElementsByClassName("yt-user-name")[1].innerText;
            var extracted_name = get_yt_name.replace(/\s/g, '');
            var new_url = url+"&channel="+extracted_name;
          } catch (e) {} // Silently fail
        }
        if (url.search("channel=") < 0) {
        // Add the name of the channel to the end of URL
        window.history.replaceState(null,null,new_url);
        // Page must be reloaded, so AdBlock can properly whitelist the page
        document.location.reload();
        }
      }
    }
  }
});