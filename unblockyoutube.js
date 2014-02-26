
// Disable HTML5 History API on YouTube
document.location.href = "javascript:void(history.pushState = undefined);";

// Initialize YouTube whitelist function
 var init = setInterval(function() {
  var url = window.location.search;
  if (url.search("channel=") == -1) {
   YouTube();
  }
 },50);

function YouTube() {
 var getytname = document.getElementsByClassName("yt-user-name")[0].innerText || document.getElementsByClassName("yt-user-name")[1].innerText;
 var url = window.location.search;
 var putintoit = url+"&channel="+getytname;
 window.history.replaceState(null,null,putintoit);
 var location = document.location.href;
 document.location.href = location;
};