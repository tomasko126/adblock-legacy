$(document).ready(function() {	
    // Check for updates
    $("#checkupdate").html(translate("checkforupdates"));
    checkupdates("help");
    
    if (navigator.language.substring(0, 2) != "en") {
        $(".english-only").css("display", "inline");
    }

    // Show debug info
    $("#debug").click(function(){
        var settings = getDebugInfo();
        $("#debugInfo").css({ width: "450px", height: "100px"});
        $("#debugInfo").html(settings);
        $("#debugInfo").fadeIn();
    });

    // Report us the bug
    $("#report").click(function(){
        var out = makeReport();
        var result = "http://support.getadblock.com/discussion/new" +
        "?category_id=problems&discussion[body]=" + out;
        document.location.href = result; 
    });
    
    // Show the changelog
    $("#whatsnew a").click(function() {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", chrome.extension.getURL("CHANGELOG.txt"), false);
        xhr.send();
        var object = xhr.responseText;
        $("#changes").text(object).css({width: "670px", height: "200px"}).fadeIn();
    });
});
