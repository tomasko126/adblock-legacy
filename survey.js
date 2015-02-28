//if the ping reponse indicates a survey (tab or overlay)
//gracefully processes the request
SURVEY = (function() {

  var survey_url = "https://ping.getadblock.com/stats/";

  //inProcess is used within the survey processing to prevent multiple tabs
  //or overlays from being openned
  //such as the case with browsers that generate a lot of pings
  var inProcess = true;

  //open a Tab for a full page survey
  var processTab = function(surveyData) {

    var waitForUserAction = function() {
      if (SAFARI) {
        safari.application.removeEventListener("open", waitForUserAction, true);
      } else {
        chrome.tabs.onCreated.removeListener(waitForUserAction);
      }
      var openTabIfAllowed = function() {
        shouldShowSurvey(surveyData, function () {
          //set inProcess to false to stop other surveys
          inProcess = false;
          openTab('https://getadblock.com/' + surveyData.open_this_url, true);
        });
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
    }

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
        //set inProcess to false to stop other surveys
        inProcess = false;
        var data = { command: "showoverlay", overlayURL: surveyData.open_this_url, tabURL:tab.url};
        if (SAFARI) {
          chrome.extension.sendRequest(data);
        } else {
          chrome.tabs.sendRequest(tab.id, data);
        }
      });
    };

    var retryInFiveMinutes = function() {
      var fiveMinutes = 5 * 60 * 1000;
      setTimeout(function() {
        processOverlay(surveyData);
      }, fiveMinutes);
    };

    getActiveTab(function(tab) {
      if (tab && validTab(tab)) {
        showOverlayIfAllowed(tab);
      } else {
        // We didn't find an appropriate tab
        retryInFiveMinutes();
      }
    });
  }//end of processOverlay()

  //functions below are used by both Tab and Overlay Surveys

  //double check with the ping server that the survey should be shown
  // Inputs:
  //   surveyData: JSON survey information from ping server
  //   callback(): called with no arguments if the survey should be shown
  var shouldShowSurvey = function(surveyData, callback) {
    var processPostData = function(responseData) {
      try {
        var data = JSON.parse(responseData);
        if (data.should_survey === 'true') {
          callback();
        }
      } catch (e) {
        console.log('Error parsing JSON: ', responseData, " Error: ", e);
        return;
      }
    };
    //stop if another survey in process
    if (!inProcess)
      return;

    var data = { cmd: "survey", u: STATS.userId, sid: surveyData.survey_id };
    $.post(survey_url, data, processPostData);
  }

  // Check the response from a ping to see if it contains valid survey instructions.
  // If so, return an object containing data about the survey to show.
  // Otherwise, return false.
  // Inputs:
  //   responseData: string response from a ping
  var surveyDataFrom = function(responseData) {
      if (responseData.length === 0)
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
      if (!url_data ||
          !url_data.open_this_url ||
          !url_data.open_this_url.match(/^\/survey\//)) {
          log("bad survey url.");
          return false;
      }
      return url_data;
  }

  return {
    maybeSurvey: function(responseData) {
      if (get_settings().show_survey === false)
        return;

      var surveyData = surveyDataFrom(responseData);
      //check the type of survey,
      if (surveyData && surveyData.type && surveyData.type === 'overlay') {
        processOverlay(surveyData);
      } else if (surveyData && surveyData.type && surveyData.type === 'tab') {
        processTab(surveyData);
      }
    }//end of maybeSurvey
  };
})();
