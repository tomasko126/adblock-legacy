// Disable HTML5 History API on YouTube
if (!SAFARI) {
window.onload = function() {
  document.location.href = "javascript:void(history.pushState = undefined);";
 }
}

// Don't run on main page and search page
var unsecure = "http://www.youtube.com/";
var secure = "https://www.youtube.com/";
var address = document.location.href;
if (address != unsecure && address != secure && address.search("feed") < 0 && address.search("search") == -1) {
 YouTube();
}

// Main function, which finds name of the channel and
// put it at the end of URL like &channel=xyz where xyz
// is name of the channel, so we are able to whitelist
// channel easily
var new_url, get_yt_name;

function YouTube() {
 var url = window.location.href;
  if (url.search("user") > 0 || url.search("/channel") > 0) {
   get_yt_name = document.getElementsByClassName("epic-nav-item-heading")[0].innerText;
   new_url = url+"?&channel="+get_yt_name;
  } else {
   get_yt_name = document.getElementsByClassName("yt-user-name")[0].innerText || document.getElementsByClassName("yt-user-name")[1].innerText;
   new_url = url+"&channel="+get_yt_name;
  }
  if (url.search("channel=") < 0) {
   window.history.replaceState(null,null,new_url);
   // Page must be reloaded, so AdBlock can properly whitelist a video
   document.location.reload();
  }
}