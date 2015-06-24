// Youtube-related code in this file based on code (c) Adblock Plus. GPLv3.
// and https://hg.adblockplus.org/adblockpluschrome/file/aed8fd38e824/safari/include.youtube.js
var run_bandaids = function() {
  // Tests to determine whether a particular bandaid should be applied
  var apply_bandaid_for = "";
  if (/mail\.live\.com/.test(document.location.hostname))
    apply_bandaid_for = "hotmail";
  else if (/getadblock\.com$/.test(document.location.hostname) &&
           window.top === window.self) {
    if (/\/question\/$/.test(document.location.pathname)) {
      apply_bandaid_for = "getadblockquestion";
    } else {
      apply_bandaid_for = "getadblock";
    }
  } else if (/mobilmania\.cz|zive\.cz|doupe\.cz|e15\.cz|sportrevue\.cz|autorevue\.cz/.test(document.location.hostname))
    apply_bandaid_for = "czech_sites";
  else if (/thepiratebay/.test(document.location.hostname))
    apply_bandaid_for = "the_pirate_bay_safari_only";
  else {
    var hosts = [ /mastertoons\.com$/ ];
    hosts = hosts.filter(function(host) { return host.test(document.location.hostname); });
    if (hosts.length > 0)
      apply_bandaid_for = "noblock";
  }
  var bandaids = {
    noblock: function() {
      var styles = document.querySelectorAll("style");
      var re = /#(\w+)\s*~\s*\*\s*{[^}]*display\s*:\s*none/;
      for (var i = 0; i < styles.length; i++) {
        var id = styles[i].innerText.match(re);
        if(id) {
          styles[i].innerText = '#' + id[1] + ' { display: none }';
        }
      }
    },
    hotmail: function() {
      //removing the space remaining in Hotmail/WLMail
      el = document.querySelector(".Unmanaged .WithSkyscraper #MainContent");
      if (el) {el.style.setProperty("margin-right", "1px", null);}
      el = document.querySelector(".Managed .WithSkyscraper #MainContent");
      if (el) {el.style.setProperty("right", "1px", null);}
      el = document.getElementById("SkyscraperContent");
      if (el) {
        el.style.setProperty("display", "none", null);
        el.style.setProperty("position", "absolute", null);
        el.style.setProperty("right", "0px", null);
      }
    },
    getadblockquestion: function() {
      BGcall('addGABTabListeners');
      var personalBtn = document.getElementById("personal-use");
      var enterpriseBtn = document.getElementById("enterprise-use");
      var buttonListener = function(event) {
        BGcall('removeGABTabListeners', true);
        if (enterpriseBtn) {
          enterpriseBtn.removeEventListener("click", buttonListener);
        }
        if (personalBtn) {
          personalBtn.removeEventListener("click", buttonListener);
        }
      };
      if (personalBtn) {
        personalBtn.addEventListener("click", buttonListener);
      }
      if (enterpriseBtn) {
        enterpriseBtn.addEventListener("click", buttonListener);
      }
    },
    getadblock: function() {
      BGcall('get_adblock_user_id', function(adblock_user_id) {
        var elemDiv = document.createElement("div");
        elemDiv.id = "adblock_user_id";
        elemDiv.innerText = adblock_user_id;
        elemDiv.style.display = "none";
        document.body.appendChild(elemDiv);
      });
      if (document.getElementById("enable_show_survey")) {
        document.getElementById("enable_show_survey").onclick = function(event) {
            BGcall("set_setting", "show_survey", !document.getElementById("enable_show_survey").checked, true);
         };
      }
    },
    czech_sites: function() {
      var player = document.getElementsByClassName("flowplayer");
      // Remove data-ad attribute from videoplayer
      if (player) {
        for (var i=0; i<player.length; i++)
          player[i].removeAttribute("data-ad");
      }
    },
    the_pirate_bay_safari_only: function() {
      // Set cookie to prevent pop-ups from The Pirate Bay
      document.cookie="tpbpop=1%7CSun%2C%2030%20Aug%202024%2006%3A21%3A49%20GMT; expires=Thu, 30 Aug 2034 12:00:00 GMT; path=/;";
    },
  }; // end bandaids

  if (apply_bandaid_for) {
    log("Running bandaid for " + apply_bandaid_for);
    bandaids[apply_bandaid_for]();
  }

};


var before_ready_bandaids = function() {

};

