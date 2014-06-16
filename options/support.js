$(document).ready(function() {
    $("#checkupdate").html(translate("checkforupdates"));
    checkupdates("help");
    $("#changelog").attr('href', SAFARI ? safari.extension.baseURI + "CHANGELOG.txt": document.location.origin+"/CHANGELOG.txt");
});
