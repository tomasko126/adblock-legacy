// Run only on YouTube
function checkYouTube() {
 if (window.location.href.search("watch") == -1) {
  return;
 } else {
  run();
 }
}

checkYouTube();

// Initialize YouTube whitelist function
var Chrome, getytname, location, url;
var Opera = navigator.userAgent.indexOf("OPR") > -1;

function run() {
 var init = setInterval(function() {
  url = window.location.search;
  if (!SAFARI) {
  if (url.search("channel=") == -1) {
   YouTube();
  }
// TODO: Safari support
  } else {
  }
 },100);
}

function YouTube() {
 getytname = document.getElementsByClassName("yt-user-name")[0].innerText || document.getElementsByClassName("yt-user-name")[1].innerText;
 var putintoit = url+"&channel="+getytname;
 window.history.replaceState(null,null,putintoit);
 url = window.location.search;
}

// When user clicks on forward/back buttons, the url is changed
// but YouTube doesn't navigate to new URL properly,
// so we must force it manually.
if (!SAFARI) {
 Chrome = parseInt(window.navigator.appVersion.match(/Chrome\/(\d+)\./)[1], 10);
}

if (Opera || Chrome <= 33 || SAFARI) {
 var loaded = false;
 window.onpopstate = function(e) {
  if (!loaded) {
   loaded = true;
   return;
  } else {
     location = document.location.href;
     document.location.href = location;
  }
}
// Chrome 34 and higher handles popstate event with another way
} else {
   window.addEventListener('popstate', function(event) {
    location = document.location.href;
    document.location.href = location;
   }, false);
}