// Run just on YouTube
if (/youtube/.test(document.location.hostname)) {
 // Disable history.pushState() on YouTube in Chrome and Opera,
 // in Safari is history.pushState() disabled in bandaids.js
 if (!SAFARI) {
  window.onload = function() {
   document.location.href = "javascript:void(history.pushState = undefined);";
  }
 }

 // Don't run on main, search and feed page
 var unsecure = "http://www.youtube.com/";
 var secure = "https://www.youtube.com/";
 var address = document.location.href;
 if (address != unsecure && address != secure && address.search("feed") < 0 && address.search("search") < 0) {
  YouTube();
 }

 // Main function, which finds name of the channel and
 // put it at the end of URL like &channel=xyz where xyz
 // is name of the channel, so we are able to whitelist
 // channel easily
 function YouTube() {
  var url = window.location.href;
  if (url.search("user") > 0 || url.search("/channel") > 0) {
   var get_yt_name = document.getElementsByClassName("epic-nav-item-heading")[0].innerText;
   var new_url = url+"?&channel="+get_yt_name;
  } else {
   var get_yt_name = document.getElementsByClassName("yt-user-name")[0].innerText || document.getElementsByClassName("yt-user-name")[1].innerText;
   var new_url = url+"&channel="+get_yt_name;
  }
  if (url.search("channel=") < 0) {
   window.history.replaceState(null,null,new_url);
   // Page must be reloaded, so AdBlock can properly whitelist a video
   document.location.reload();
  }
 }
}