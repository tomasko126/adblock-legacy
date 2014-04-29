// If history.pushState is available, YouTube uses the history API
// when navigation from one video to another, and tells the flash player with JavaScript
// which video and which ads to show next, bypassing our flashvars rewrite code.
// So we disable history.pushState on pages with YouTube's flash player,
// this will for the site to use to a page reload.
if (/youtube/.test(document.location.hostname)) {
  var s = document.createElement("script");
  s.type = "application/javascript";
  s.async = false;
  s.textContent = "history.pushState = undefined;";
  document.documentElement.appendChild(s);
  document.documentElement.removeChild(s);
  
  var url = document.location.href;    
  window.onbeforeunload = function() {
    if (url.search("channel=") > 0)
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
      // Don't run on main, search and feed page
      if (url.search("channel=") < 0 && /channel|watch/.test(url) && url.search("feed") < 0) {
        if (/channel/.test(url)) {
          var get_yt_name = document.querySelector(".qualified-channel-title-text a[href*='/channel/']");
          if (!get_yt_name) {
            get_yt_name = document.querySelector(".epic-nav-item-heading").innerText;
            var extracted_name = get_yt_name.split('/').pop();
          } else {
            var extracted_name = get_yt_name.getAttribute("href").split('/').pop();
          }
          var new_url = url+"?&channel="+extracted_name;
        } else {
          var get_yt_name = document.querySelector("#watch7-channel-header a[href*='/channel/']").getAttribute("href");
          var extracted_name = get_yt_name.split('/').pop();
          var new_url = url+"&channel="+extracted_name;
        }
        // Add the name of the channel to the end of URL
        window.history.replaceState(null,null,new_url);
        // Page must be reloaded, so AdBlock can properly whitelist the page
        document.location.reload(false);
      }
    }
  });
}