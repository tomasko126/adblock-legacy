// Set up variables
var AdBlockVersion = chrome.runtime.getManifest().version;

// Get enabled settings
var enabled_settings = [];
BGcall("get_settings", function(settings) {
    for (setting in settings) {
        if (settings[setting]) {
            enabled_settings.push(setting);
        }
    }
});

// Get subscribed filter lists
var subscribed_filter_names = [];
BGcall("get_subscriptions_minus_text", function(subs) {
    for (var id in subs) {
        if (subs[id].subscribed)
            subscribed_filter_names.push(id);
    }
});

// Create the debug info for the textbox or the bug report
var getDebugInfo = function () {
    var info = [];
    info.push("==== Filter Lists ====");
    info.push(subscribed_filter_names.join('  \n'));
    info.push("");
    info.push("==== Settings ====");
    info.push(enabled_settings.join('  \n'));
    info.push("");
    info.push("==== Other info: ====");
    if (AdBlockVersion)
        info.push("AdBlock version number: " + AdBlockVersion);
    info.push("UserAgent: " + navigator.userAgent.replace(/;/,""));
    return info.join('  \n');
};

// Create a bug report
var makeReport = function(){
    var body = [];
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
    body.push("**What should happen when you do the above steps**");
    body.push("");
    body.push("");
    body.push("**What actually happened?**");
    body.push("");
    body.push("");
    body.push("**Do you have any other comments? If you can, can you please attach a screenshot of the bug?**");
    body.push("");
    body.push("");
    body.push("--- The questions below are optional but VERY helpful. ---");
    body.push("");
    body.push("If unchecking all filter lists fixes the problem, which one filter" + 
              "list must you check to cause the problem again after another restart?");
    body.push("");
    body.push("Technical Chrome users: Go to chrome://extensions ->" +
              "Developer Mode -> Inspect views: background page -> Console. " +
              "Paste the contents here:");
    body.push("");
    body.push("====== Do not touch below this line ======");
    body.push("");
    body.push(getDebugInfo());
    
  
    var out = encodeURIComponent(body.join('  \n'))
    return out;
};

$(document).ready(function() {
	// Hide the (English only) translation for English
	$("span[i18n=englishOnly").css("display", "none");
	
    // Check for updates
    $("#checkupdate").html(translate("checkforupdates"));
    checkupdates("help");

    // Enable the debug info button
    $("#debug").click(function(){
        var settings = getDebugInfo();
        $("#debugInfo").css({display: "block", width: "450px", height: "100px"});
        $("#debugInfo").html(settings);
    });

    // Enable the bug report button
    $("#report").click(function(){
        var out = makeReport();
        var result = "http://support.getadblock.com/discussion/new" +
        "?category_id=problems&discussion[body]=" + out;

        document.location.href = result; 
    });
});
