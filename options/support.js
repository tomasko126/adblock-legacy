// Set up variables
var AdBlockVersion = chrome.runtime.getManifest().version;

var getDebugInfo = function () {
  var info = [];
  info.push("==== Filter Lists ====");
  info.push(getUserLists().subscribed.join('  \n'));
  info.push("");
  info.push("==== Settings Enabled ====");
  info.push(getUserSettings.join('  \n'));
  
  return info.join('  \n');
};

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
  // Check for updates
  $("#checkupdate").html(translate("checkforupdates"));
  checkupdates("help");
  
  // Enable the debug info button
  $("#debug input").click(function(){
	  var debug_info = getDebugInfo();
	  
	  $("#debugInfo").text(debug_info);
	  $("#debugInfo").css("display", "inline");
  });
  
  // Enable the bug report button
  $("#reports input").click(function(){
    var out = makeReport();
	  
    var result = "https://support.getadblock.com/discussion/new" +
      "?category_id=problems&discussion[body]=" + out;
    
	document.location.href = result; 
  })
});



