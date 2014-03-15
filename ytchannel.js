// Run just on YouTube
if (/youtube/.test(document.location.hostname)) {
  // If history.pushState is available, YouTube uses the history API
  // when navigation from one video to another, and tells the flash player with JavaScript
  // which video and which ads to show next, bypassing our flashvars rewrite code.
  // So we disable history.pushState on pages with YouTube's flash player,
  // this will for the site to use to a page reload.
  if (!SAFARI) {
    window.onload = function() {
      document.location.href = "javascript:void(history.pushState = undefined);";
    }
  // Onload event is fired differently in Safari,
  // so we have to check whether the page has been completely loaded
  // or not by using readyState event
  } else {
    var _timer=setInterval(function() {
      if (/loaded|complete/.test(document.readyState)) {
        clearInterval(_timer);
        document.location.href = "javascript:void(history.pushState = undefined);";
      }
    }, 250)
  }

  // Remove body when YouTube is loading another video,
  // so we don't see the same page twice in some cases
  window.onbeforeunload = function() {
    document.body.parentNode.removeChild(document.body);
  }

  // Don't run on main, search and feed page
  var unsecure = "http://www.youtube.com/";
  var secure = "https://www.youtube.com/";
  var address = document.location.href;
  if (address !== unsecure && address !== secure && address.search("feed") < 0 && address.search("search") < 0) {
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
