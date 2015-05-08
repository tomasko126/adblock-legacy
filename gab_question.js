// Utlized on certain getadblock.com pages
// adds retry (reopen) logic when we don't 
// get a repsonse from the user
// currently, on the 'gab.com/question' page
gabQuestion = (function() {
  var questionTab = null;
  var gabTabListenersAdded = false;

  //Question tab listeners - Chrome & Safari
  var onTabRemovedListener = function(tabId, removeInfo) {
    //check if the tab remove is the question tab,
    //if so, re-open it
    if (questionTab &&
        questionTab.id === tabId &&
        removeInfo &&
        !removeInfo.isWindowClosing) {
          openQuestionTab();
    }
  };
  var onTabUpdatedListener = function(tabId, changeInfo, tab) {
    //check if the tab updated is the question tab,
    //if so, re-open it    
    if (questionTab &&
        questionTab.id === tabId &&
        tab &&
        tab.url !== questionTab.url) {
          openQuestionTab();
    }
  };
  var onTabCloseListener = function(event) {
    //called when the question tab is closed,
    //if so, re-open the question tab    
    if (event &&
        event.type === "close") {
      openQuestionTab();
      //remove the listeners, so we don't listen to an old tab
      removeGABTabListeners();
    }
  };
  var onTabNavigateListener = function(event) {
    //called when the user navigates to a different URL in the question tab
    //re-open the question tab
    if (event &&
        event.type === "navigate" &&
        event.target &&
        event.target.url !== questionURL) {
      openQuestionTab();
      //remove the listeners, so we don't listen to wrong tab
      removeGABTabListeners();
    }
  };
  var numQuestionAttempts = 0;
  var questionTabOpenInProgress = false;
  //TODO - change to prod URL
  var questionURL = "http://dev.getadblock.com/question/?u=" + STATS.userId;
  //opens a new Tab, and returns a reference to the new tab.
  //similiar to openTab() in background.js, 
  //but different in that a reference to the new tab is returned.
  var openNewSafariTab = function(tabURL) {
    if (!SAFARI) {    
      return null;  
    }
    var newTab;
    var safariWindow = safari.application.activeBrowserWindow;
    if (safariWindow) {
        newTab = safariWindow.openTab("foreground"); // index may be undefined
        if (!safariWindow.visible) {
            safariWindow.activate();
        }
    } else {
        newTab = safari.application.openBrowserWindow().tabs[0];
    }
    newTab.url = tabURL;
    return newTab;
  };
  var openQuestionTab = function() {
    //if we've already opened the 'question' tab 3 times,
    //and the user ignores us, give up
    if (numQuestionAttempts > 2) {
      removeGABTabListeners(true);
      return;
    }
    //already an open question tab in progress, don't need to open another
    if (questionTabOpenInProgress) {
      return;
    }
    questionTabOpenInProgress = true;
    numQuestionAttempts++;
    var oneMinute = 60 * 1000;
    setTimeout(function() {
      questionTabOpenInProgress = false;
      if (SAFARI) {
          questionTab = openNewSafariTab(questionURL + "&a=" + numQuestionAttempts);
      } else {
        chrome.tabs.create({url: questionURL + "&a=" + numQuestionAttempts}, function(tab) {
          questionTab = tab;
        });
      }
    }, oneMinute);
  };
  var addGABTabListeners = function(sender) {
    //if the question tab is null, log a message and return
    if (!sender || !sender.tab) {
      recordErrorMessage('question tab null');
      return;
    }
    if (gabTabListenersAdded || storage_get('type-question')) {
      return;
    }
    questionTab = sender.tab;
    gabTabListenersAdded = true;
    if (chrome.tabs && chrome.tabs.onRemoved && chrome.tabs.onUpdated) {
      chrome.tabs.onRemoved.addListener(onTabRemovedListener);
      chrome.tabs.onUpdated.addListener(onTabUpdatedListener);
    } else if (questionTab.addEventListener) {
      questionTab.addEventListener("close", onTabCloseListener, true);
      questionTab.addEventListener("navigate", onTabNavigateListener, true);
    }
  };
  var removeGABTabListeners = function(saveState) {
    if (saveState) {
      storage_set('type-question',saveState);
    }
    if (chrome.tabs && chrome.tabs.onRemoved && chrome.tabs.onUpdated) {
      chrome.tabs.onRemoved.removeListener(onTabRemovedListener);
      chrome.tabs.onUpdated.removeListener(onTabUpdatedListener);
    } else if (questionTab.removeEventListener) {
      questionTab.removeEventListener("close", onTabCloseListener, true);
      questionTab.removeEventListener("navigate", onTabNavigateListener, true);
    }
  };
  
  return {
    // True if AdBlock was just installed.
    init: addGABTabListeners,
    removeGABTabListeners: removeGABTabListeners,
  };
      
})();  