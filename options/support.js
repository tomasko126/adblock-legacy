// Set up variables
var AdBlockVersion = chrome.runtime.getManifest().version;

// Create the debug info for the textbox or the bug report
var getDebugInfo = function () {
  var info = [];
  info.push("==== Filter Lists ====");
  info.push(getUserLists().subscribed.join('  \n'));
  info.push("");
  info.push("==== Settings Enabled ====");
  info.push(getUserSettings.join('  \n'));
  
  return info.join('  \n');
};

// Create a bug report
var makeReport = function(){
  var body = [];
  if (AdBlockVersion)
    body.push("AdBlock version number: " + AdBlockVersion);
  body.push("UserAgent: " + navigator.userAgent);
  body.push("");
  body.push("Please answer the following questions so that we can process your bug report, otherwise, we may have to ignore it.");
  body.push("Also, please put your name, or a screen name, and your email above so that we can contact you if needed.");
  body.push("If you don't want your report to be made public, check that box, too.");
  body.push("");
  body.push("**Can you provide detailed steps on how to reproduce the problem?**");
  body.push("");
  body.push("1. ");
  body.push("2. ");
  body.push("3. ");
  body.push("");
  body.push("**What should happen when you do the above steps");
  body.push("");
  body.push("");
  body.push("**What actually happened?**");
  body.push("");
  body.push("");
  body.push("**Do you have any other comments? If you can, can you please attach a screenshot of the bug?");
  body.push("");
  body.push("");
  body.push("====== Do not touch below this line ======");
  body.push(getDebugInfo());
  
  var out = body.join("  \n");
  return out;
  
};

$(document).ready(function() {
    // Check, whether update is available
    $("#checkupdate").html(translate("checkforupdates"));
    checkupdates("help");
    
    // Show the changelog
    $("#whatsnew a").click(function() {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", chrome.extension.getURL("CHANGELOG.txt"), false);
        xhr.send();
        var object = xhr.responseText;
        $("#changes").text(object).css({width: "670px", height: "200px"}).fadeIn();
    });
});
