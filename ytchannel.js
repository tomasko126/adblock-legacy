// Run just on YouTube
if (/youtube/.test(document.location.hostname)) {
  // Disable history.pushState() on YouTube,
  // so we won't have problems with navigation and running this code.
  // TODO: Handle this code more efficiently, after the page has been loaded
  setTimeout(function() {
    document.location.href = "javascript:void(history.pushState = undefined);";
  },250);
  
  // Don't run on main, search and feed page
  var unsecure = "http://www.youtube.com/";
  var secure = "https://www.youtube.com/";
  var address = document.location.href;
  if (address != unsecure && address != secure && address.search("feed") < 0 && address.search("search") < 0) {
    changeURL();
  }

  // Main function, which finds name of the channel and puts it at the end of the URL.
  // On the end will be "&channel=xyz", where "xyz" is a name of the channel,
  // so we are able to whitelist the YouTube channel with the easiest way
  function changeURL() {
    var url = document.location.href;
    // Grab name of the channel
    if (url.search("user") > 0 || url.search("/channel") > 0) {
      var get_yt_name = document.getElementsByClassName("epic-nav-item-heading")[0].innerText;
      var new_url = url+"?&channel="+get_yt_name;
    } else {
      var get_yt_name = document.getElementsByClassName("yt-user-name")[0].innerText || document.getElementsByClassName("yt-user-name")[1].innerText;
      var new_url = url+"&channel="+get_yt_name;
    }
    if (url.search("channel=") < 0) {
      // We remove the body of the page, so user won't see reloading of the page
      document.body.parentNode.removeChild(document.body);
      // Add the name of the channel to the end of URL
      window.history.replaceState(null,null,new_url);
      // Page must be reloaded, so AdBlock can properly whitelist the page
      document.location.reload();
    }
  }
}