//if the ping reponse indicates a survey (tab or overlay)
//gracefully processes the request
SURVEY = (function() {
  var survey_url = "https://ping.getadblock.com/stats/";
  //long lived var to store tab survey data
  var survey_data = null;

  var shouldShowTabSurvey = function(surveyData) {
    function handle_should_survey(responseData) {
      if (responseData.length ===  0)
        return;
      openTab('https://getadblock.com/' + surveyData.open_this_url, true);
    }
    shouldShowSurvey(surveyData, handle_should_survey);
  }

  function one_time_opener() {
    if (SAFARI) {
      safari.application.removeEventListener("open", one_time_opener, true);
    } else {
      chrome.tabs.onCreated.removeListener(one_time_opener);
    }
    if (!one_time_opener.running)
      return; // one_time_opener was called multiple times
    if (survey_data == null)
      return;
    one_time_opener.running = false;
    var open_the_tab = function() {
      // see if survey should still be shown before opening tab
      shouldShowTabSurvey(survey_data);
    };
    if (SAFARI) {
      // Safari has a bug: if you open a new tab, it will shortly thereafter
      // set the active tab's URL to "Top Sites". However, here, after the
      // user opens a tab, we open another. It mistakenly thinks
      // our tab is the one the user opened and clobbers our URL with "Top
      // Sites."
      // To avoid this, we wait a bit, let it update the user's tab, then
      // open ours.
      window.setTimeout(open_the_tab, 500);
    } else {
      open_the_tab();
    }
  }

  return {
    //include shouldShowSurvey so that createOverlay in background.js can call it.
    shouldShowSurvey: function(surveyData, callback) {
      var processPostData = function(responseData) {
        log('survey check response data', responseData);
        try {
          var data = JSON.parse(responseData);
          if (data.should_survey === 'true')
            callback(responseData);
        } catch (e) {
          console.log('Error parsing JSON: ', responseData, " Error: ", e);
          return;
        }
      };
      var data = {
        cmd: "survey",
        u: STATS.userId,
        sid: surveyData.survey_id
      };
      if (!callback)
          return;
      $.post(survey_url, data, processPostData);
    },
    //include maybeSurvey so that STATS.js can call it.
    maybeSurvey: function(responseData) {
      if (responseData.length === 0)
        return;
  
      if (get_settings().show_survey === false)
        return;
  
      log('Pinging got some data', responseData);
  
      try {
        var url_data = JSON.parse(responseData);
      } catch (e) {
        console.log("Something went wrong with opening a survey.");
        console.log('error', e);
        console.log('response data', responseData);
        return;
      }
      if (!url_data.open_this_url.match(/^\/survey\//)) {
          log("bad survey url.");
          return;
      }
      //check the type of survey,
      if (url_data.type && url_data.type === 'overlay') {
        createOverlay(url_data);
        //for overlay surveys don't set survey_data
        //unset it, so a new tab isn't incorrectly openned
        survey_data = null;
      } else if (url_data.type && url_data.type === 'tab') {
          survey_data = url_data;
          one_time_opener.running = true;
          if (SAFARI) {
            //safari.application.removeEventListener("open", one_time_opener, true);
            safari.application.addEventListener("open", one_time_opener, true);
          } else {
            if (chrome.tabs.onCreated.hasListener(one_time_opener))
                chrome.tabs.onCreated.removeListener(one_time_opener);
            chrome.tabs.onCreated.addListener(one_time_opener);
          }
       }
    }//end of maybeSurvey
  };
})();