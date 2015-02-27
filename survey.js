//if the ping reponse indicates a survey (tab or overlay)
//gracefully processes the request
SURVEY = (function() {

  var survey_url = "https://ping.getadblock.com/qa-stats/";
  //long lived var to store tab survey data
  var tabSurveyData = null;

  //inProcess is used within the survey processing to prevent multiple tabs
  //or overlays from being openned
  //such as the case with browsers that generate a lot of pings
  var inProcess = true;

  //open a Tab for a full page survey
  var processTab = function(surveyData) {
    console.log("processTab", inProcess);

   var waitForUserAction = function() {
      if (SAFARI) {
        safari.application.removeEventListener("open", waitForUserAction, true);
      } else {
        chrome.tabs.onCreated.removeListener(waitForUserAction);
      }
      console.log("processTab", inProcess);
      if (!inProcess) {
        console.log("processTab returning");
        return; // waitForUserAction was called multiple times
      }
      if (tabSurveyData == null) {
        return;
      }
      inProcess = false;
      var openTheTab = function() {
        // see if survey should still be shown before opening tab
        shouldShowTabSurvey(tabSurveyData);
      };
      if (SAFARI) {
        // Safari has a bug: if you open a new tab, it will shortly thereafter
        // set the active tab's URL to "Top Sites". However, here, after the
        // user opens a tab, we open another. It mistakenly thinks
        // our tab is the one the user opened and clobbers our URL with "Top
        // Sites."
        // To avoid this, we wait a bit, let it update the user's tab, then
        // open ours.
        window.setTimeout(openTheTab, 500);
      } else {
        openTheTab();
      }
    }

    var shouldShowTabSurvey = function(surveyData) {
      function handle_should_survey(responseData) {
        if (responseData.length ===  0)
          return;
        openTab('https://getadblock.com/' + surveyData.open_this_url, true);
      }
      shouldShowSurvey(surveyData, handle_should_survey);
    }
 
    tabSurveyData = surveyData;   
    if (SAFARI) {
      safari.application.addEventListener("open", waitForUserAction, true);
    } else {
      if (chrome.tabs.onCreated.hasListener(waitForUserAction)) {
          chrome.tabs.onCreated.removeListener(waitForUserAction);
      }
      chrome.tabs.onCreated.addListener(waitForUserAction);
    }
  }//end of processTab()

  //Display a notification overlay on the active tab
  // To avoid security issues, the tab that is selected must not be incognito mode (Chrome only),
  // and must not be using SSL / HTTPS
  var processOverlay = function(surveyData) {
    if (!surveyData) {
      return;
    }
    // Call |callback(tab)|, where |tab| is the active tab, or undefined if
    // there is no active tab.
    var getActiveTab = function(callback) {
      if (!SAFARI) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          callback(tabs[0]);
        });
      } else {
        var target = safari || {};
        target = target.application || {};
        target = target.activeBrowserWindow || {};
        callback(target.activeTab);
      }
    };

    // True if we are willing to show an overlay on this tab.
    var validTab = function(tab) {
      if (!SAFARI) {
        if (tab.incognito || tab.status !== "complete") {
          return false;
        }
      }
      return /^http:/.test(tab.url);
    }

    // Check to see if we should show the survey before showing the overlay.
    var showOverlayIfAllowed = function(tab) {
      shouldShowSurvey(surveyData, function() {
        console.log("callbackoverlay", inProcess);
        if (!inProcess) {
          console.log("callbackoverlay returning", inProcess);
          return;
        }
        inProcess = false;        
        var data = { command: "showoverlay", overlayURL: surveyData.open_this_url, tabURL:tab.url};
        //TODO
        console.log("open overlay", data);
        if (SAFARI) {
          chrome.extension.sendRequest(data);
        } else {
          chrome.tabs.sendRequest(tab.id, data);
        }
      });
    };

    var retryInFiveMinutes = function() {
      //TODO
      var fiveMinutes = 1 * 60 * 1000;
      setTimeout(function() {
        processOverlay(surveyData);
      }, fiveMinutes);
    };

    getActiveTab(function(tab) {
      if (tab && validTab(tab)) {
        console.log("found tab");
        showOverlayIfAllowed(tab);
      } else {
        //TODO
        console.log("wait 5 min");
        // We didn't find an appropriate tab
        retryInFiveMinutes();
      }
    });
  }//end of processOverlay()

  //functions below are used by both Tab and Overlay Surveys

  var validCurrentSurveyData = function(surveyData) {
    //check if the current state of the 'InProcess' flags match the type in the surveyData argument
    //surveyData should not be null in either case and...
    //For Tab Surveys, the surveyData type should be tab, and inProcess should true (initial, default value)
    //For Overlay Surveys, the surveyData type should be overlay, and inProcess should be true (initial, default value)
    if (surveyData && surveyData.type && surveyData.type === 'tab') {
      return inProcess;
    } else if (surveyData && surveyData.type && surveyData.type === 'overlay') {
      return inProcess;
    } else {
      return false; 
    }
  }

  //double check with the ping server that the survey should be shown
  var shouldShowSurvey = function(surveyData, callback) {
    var processPostData = function(responseData) {
      try {
        var data = JSON.parse(responseData);
        console.log("shouldShowSurvey", data);
        if (data.should_survey === 'true') {
          console.log("calling callback");
          callback(responseData);
        }
      } catch (e) {
        console.log('Error parsing JSON: ', responseData, " Error: ", e);
        return;
      }
    };

    if (!callback)
      return;
    if (!surveyData)
      return;
//    if (!validCurrentSurveyData(surveyData))
//      return;

    var data = { cmd: "survey", u: STATS.userId, sid: surveyData.survey_id };
    processPostData(JSON.stringify({"should_survey": "true", "type": "overlay"}));
    //TODO
    //$.post(survey_url, data, processPostData);
  }

  //check if the responseData from the initial 'ping' is valid
  //if so, parses it into an Object.
  var validPingResponseData = function(responseData) {
      if (responseData.length === 0)
        return false;

      if (get_settings().show_survey === false)
        return false;

      log('validating ping response data', responseData);

      try {
        var url_data = JSON.parse(responseData);
      } catch (e) {
        console.log("Something went wrong with parsing survey data.");
        console.log('error', e);
        console.log('response data', responseData);
        return false;
      }
//TODO      
//      if (!url_data || 
//          !url_data.open_this_url ||
//          !url_data.open_this_url.match(/^\/survey\//)) {
//          log("bad survey url.");
//          return false;
//      }
      return url_data;
  }

  return {
    maybeSurvey: function(responseData) {
      var url_data = validPingResponseData(responseData);
      //check the type of survey,
      if (url_data && url_data.type && url_data.type === 'overlay') {
        processOverlay(url_data);
//        //for overlay surveys don't set tabSurveyData
//        //unset it, so a new tab isn't incorrectly openned
//        tabSurveyData = null;
      } else if (url_data && url_data.type && url_data.type === 'tab') {
        processTab(url_data);
      }
    }//end of maybeSurvey
  };
})();