// Disable HTML5 History API on YouTube
document.location.href = "javascript:void(history.pushState = undefined);";

// Don't run on main page
var mainpage = "http://www.youtube.com/" || "https://www.youtube.com/";
if (document.location.href != mainpage) {
  YouTube();
}

function YouTube() {
 var getytname = document.getElementsByClassName("yt-user-name")[0].innerText || document.getElementsByClassName("yt-user-name")[1].innerText;
 var url = window.location.search;
 var putintoit = url+"&channel="+getytname;
  if (url.search("channel=") < 0) {
   window.history.replaceState(null,null,putintoit);
   // Page must be reloaded, so AdBlock can properly whitelist a video
   document.location.reload();
  }
};