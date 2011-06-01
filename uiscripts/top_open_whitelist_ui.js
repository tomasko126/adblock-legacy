// Global lock so we can't open more than once on a tab.
if (typeof may_open_dialog_ui === "undefined")
    may_open_dialog_ui = true;

function top_open_whitelist_ui() {
  if (!may_open_dialog_ui)
    return;
  var domain = document.location.hostname;

  // defined in blacklister.js
  load_jquery_ui(function() {
    may_open_dialog_ui = false;

    var btns = {};
    btns[translate("buttoncancel")] = function() { page.dialog('close');}
    btns[translate("buttonexclude")] = 
        function() {
          var filter = '@@||' + generateUrl() + '$document';
          BGcall('add_custom_filter', filter, function() {
            document.location.reload();
          });
        }

    var page = $("<div>").
      append('<span id="whitelister_caption">').
      append('<br/><br/><i id="domainpart"></i><i id="pathpart"></i>').
      append("<br/><br/><br/><span id='whitelister_dirs'>" + 
             translate('you_can_slide_to_change') + "</span>").
      append('<br/><span id="modifydomain">' + translate('modifydomain') +
             "<input id='domainslider' type='range' min='0' value='0'/></span>").
      append('<span id="modifypath">' + translate('modifypath') +
             "<input id='pathslider' type='range' min='0' value='0'/></span>").
      dialog({
        title: translate("whitelistertitle2"),
        width: 600,
        minHeight: 50,
        buttons: btns,
        close: function() {
          may_open_dialog_ui = true;
          page.remove();
        }
      });

    var domainparts = domain.split('.');
    if (domainparts[domainparts.length - 2] == "co") {
      var newTLD = "co." + domainparts[domainparts.length - 1];
      domainparts.splice(domainparts.length - 2, 2, newTLD);
    }
    var location = document.location.href.match(/\w+\:\/\/[^\/]+(.*?)(\/?)(\?|$)/);
    var pathparts = location[1].split('/');

    // Don't show the domain slider on
    // - sites without a third level domain name (e.g. foo.com)
    // - sites with an ip domain (e.g. 1.2.3.4)
    // Don't show the location slider on domain-only locations
    var noThirdLevelDomain = (domainparts.length == 2);
    var domainIsIp = /^(\d+\.){3}\d+$/.test(domain);
    var showDomain = !(noThirdLevelDomain || domainIsIp);
    $("#modifydomain", page).toggle(showDomain);
    var showPath = !!(location[1]);
    $("#modifypath", page).toggle(showPath);
    $("#whitelister_dirs", page).toggle(showDomain || showPath);

    
    $("#domainpart, #pathpart", page).
      css("fontSize", "medium !important");
    $("#pathpart").css("color", "grey");

    $("#domainslider", page).
      attr("max", Math.max(domainparts.length - 2, 1));
    $("#pathslider", page).
      attr("max", Math.max(pathparts.length - 1, 1));
    $("#pathslider, #domainslider", page).
      css('width', '100px').
      change(onSliderChange);

    function onSliderChange() {
      generateUrl(true);
      updateCaption();
    }
    onSliderChange();

    // Set the caption based on how much we are offering to whitelist
    function updateCaption() {
      var dS = $("#domainslider", page)[0];
      var pS = $("#pathslider", page)[0];

      var msg;
      if (dS.value == dS.min && pS.value == pS.min)
        msg = "adblock_wont_run_anywhere_on_this_website";
      else if (dS.value == dS.min && pS.value == pS.max)
        msg = "adblock_wont_run_on_this_page";
      else
        msg = "adblock_wont_run_on_pages_matching";

      $("#whitelister_caption", page).text(translate(msg));
    }

    // Generate the URL. If forDisplay is true, then it will truncate long URLs
    function generateUrl(forDisplay) {
      var result = "";
      var domainsliderValue = $("#domainslider", page)[0].valueAsNumber;
      var pathsliderValue = $("#pathslider", page)[0].valueAsNumber;

      // Make clear that it includes subdomains
      if (forDisplay && domainsliderValue != 0)
        result = "*.";

      // Append the chosen parts of a domain
      for (var i = domainsliderValue; i<=(domainparts.length - 2); i++) 
        result += domainparts[i] + '.';
      result += domainparts[domainparts.length - 1];
      for (var i = 1; i<=pathsliderValue; i++) 
        result += '/' + pathparts[i];

      // Append a final slash for for example filehippo.com/download_dropbox/
      if (pathparts.length != pathsliderValue + 1 || !location[1]) {
        result += "/";
        if (forDisplay)
          result += "*";
      } else {
        if (location[2])
          result += location[2];
      }

      if (forDisplay) {
        result = result.replace(/(\/[^\/]{6})[^\/]{3,}([^\/]{6})/g, '$1...$2');
        if (result.indexOf("/") > 30 && result.length >=60)
          result = result.replace(/^([^\/]{20})[^\/]+([^\/]{6}\/)/, '$1...$2')
        while (result.length >= 60)
          result = result.replace(/(\/.{4}).*?\/.*?(.{4})(?:\/|$)/, '$1...$2/');
        var domainpart = result.match(/^[^\/]+/)[0];
        var pathpart = result.match(/\/.*$/)[0];
        $("#domainpart", page).text(domainpart);
        $("#pathpart", page).text(pathpart);
      } else
        return result;
    }
  });
}
