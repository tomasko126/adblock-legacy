// Disable HTML5 History API on YouTube
document.location.href = "javascript:void(history.pushState = undefined);";

// It is unnecessary to run it on main page
var oldLocation = "http://www.youtube.com/";
if (document.location.href != oldLocation) {
 window.onload = function() {
  YouTube();
 }
}

function YouTube() {
 var getytname = document.getElementsByClassName("yt-user-name")[0].innerText || document.getElementsByClassName("yt-user-name")[1].innerText;
 var url = window.location.search;
 var putintoit = url+"&channel="+getytname;
  if (url.search("channel=") > 0) {
   return;
  } else {
   window.history.replaceState(null,null,putintoit);
   document.location.reload();
  }
};