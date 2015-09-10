﻿//show existing users the acceptable ads info once (and only once)
AcceptableAds = (function() {

  //open a Tab showing the explanation
  var processTab = function() {

    var waitForUserAction = function() {

      if (SAFARI) {
        safari.application.removeEventListener("open", waitForUserAction, true);
      } else {
        chrome.tabs.onCreated.removeListener(waitForUserAction);
      }

      var openTabIfAllowed = function() {
        openTab("pages/acceptableadsexplaination.html");
        storage_set("acceptableAdsShown", true);
        subscribe({id: "acceptable_ads"});
      }

      if (SAFARI) {
        // Safari has a bug: if you open a new tab, it will shortly thereafter
        // set the active tab's URL to "Top Sites". However, here, after the
        // user opens a tab, we open another. It mistakenly thinks
        // our tab is the one the user opened and clobbers our URL with "Top
        // Sites."
        // To avoid this, we wait a bit, let it update the user's tab, then
        // open ours.
        window.setTimeout(openTabIfAllowed, 500);
      } else {
        openTabIfAllowed();
      }
    };

    if (SAFARI) {
      safari.application.addEventListener("open", waitForUserAction, true);
    } else {
      if (chrome.tabs.onCreated.hasListener(waitForUserAction)) {
          chrome.tabs.onCreated.removeListener(waitForUserAction);
      }
      chrome.tabs.onCreated.addListener(waitForUserAction);
    }
  }; //end of processTab()

  var acceptableAdsShown = storage_get("acceptableAdsShown");
  //check if we need show the info
  if (!acceptableAdsShown && !STATS.firstRun) {
    processTab();
  } else if (STATS.firstRun) {
    //do not show new users acceptable ads info
    storage_set("acceptableAdsShown", true);
  }

})();
