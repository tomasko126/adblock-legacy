(function() {
  // Tests to determine whether a particular bandaid should be applied
  var test_whether_to_apply = {
    hotmail: function() { return /mail\.live\.com/.test(document.location.host); },
    hkpub:   function() { return /\.hk-pub\.com\/forum\/thread\-/.test(document.location.href); },
    youtube: function(settings) { return /youtube/.test(document.domain) && settings.block_youtube; }
  };

  var bandaids = {
    hotmail: function() {
      //removing the space remaining in Hotmail/WLMail
      $(".Unmanaged .WithSkyscraper #MainContent").
        css("margin-right", "1px");
      $(".Managed .WithSkyscraper #MainContent").
        css("right", "1px");
    },

    hkpub: function() {
      //issue 3971: due to 'display:none' the page isn't displayed correctly
      $("#AutoNumber1").
        css("width", "100%").
        css("margin", "0px");
    },

    youtube: function(settings) {
      function blockYoutubeAds(videoplayer) {
        var flashVars = $(videoplayer).attr('flashvars');
        var inParam = false;
        if(!flashVars) {
            flashVars = videoplayer.querySelector('param[name="flashvars"]');
            // Give up if we still can't find it
            if(!flashVars)
                return;
            inParam = true;
            flashVars = flashVars.getAttribute("value");
        }
        var adRegex = /(^|\&)((ad_.+?|prerolls|interstitial)\=.+?|invideo\=true)(\&|$)/gi;
        if(!adRegex.test(flashVars))
            return;

        log("Removing YouTube ads");
        var adReplaceRegex = /\&((ad_\w+?|prerolls|interstitial|watermark|infringe)\=[^\&]*)+/gi;
        flashVars = flashVars.replace(adReplaceRegex, '');
        flashVars = flashVars.replace(/\&invideo\=True/i, '&invideo=False');
        flashVars = flashVars.replace(/\&ad3_module\=[^\&]*/i, '&ad3_module=about:blank');
        var replacement = videoplayer.cloneNode(true);
        if (inParam) {
            // Grab new <param> and set its flashvars
            newParam = replacement.querySelector('param[name="flashvars"]');
            newParam.setAttribute("value", flashVars);
        } else {
            replacement.setAttribute("flashvars", flashVars);
        }
        videoplayer.parentNode.replaceChild(replacement, videoplayer);

        if (settings.show_youtube_help_msg) {
          var disable_url = chrome.extension.getURL("options/index.html");
          var message = $("<div>").
            css({"font-size": "x-small", "font-style": "italic",
                 "text-align": "center", "color": "black",
                 "font-weight": "normal", "background-color": "white"}).
            append("<span>" + translate("youtubevideomessage", 
                ["<a target='_new' href='" + disable_url + "'>" + 
                translate("optionstitle") + "</a>"]) + "</span>");
          var closer = $("<a>", {href:"#"}).
            css({"font-style":"normal", "margin-left":"20px"}).
            text("[x]").
            click(function() {
              message.remove();
              BGcall("do_not_show_youtube_help_msg");
            });
          message.append(closer);
          $("#movie_player").before(message);
        }
      }
      
      if ($("#movie_player").length > 0) {
        //the movie player is already inserted
        blockYoutubeAds($("#movie_player")[0]);
      } else {
        //otherwise it has to be inserted yet
        document.addEventListener("DOMNodeInserted", function(e) {
          if (e.target.id != "movie_player")
            return;
          blockYoutubeAds(e.target);
          this.removeEventListener('DOMNodeInserted', arguments.callee, false);
        }, false);
      }
    }

  }; // end bandaids

  // Once content script data is available, run special site-specific code.
  GLOBAL_contentScriptData.onReady(function(data) {
    console.warn("Running onReady for bandaids.");
    var settings = data.settings;
    for (var name in test_whether_to_apply) {
      if (test_whether_to_apply[name](settings)) {
        console.warn("Running bandaid " + name);
        bandaids[name](settings);
      }
    }
  });

})();
