adData = {
  initialize: function() {
    this.ensureUserGroupIsSet();
    this.ignoreUserIfGroupChanged();
  },
  getUserGroup: function() {
    return storage_get('addata_experiment_user_group');
  },
  setUserGroup: function(value) {
    storage_set('addata_experiment_user_group', value);
    // record on server
    STATS.msg("AdData experiment group: " + value);
  },
  determineUserGroup: function(){
    //  Group A: AdBlock users who never turn on AdBlock during the experiment window. - 'ignored'
    //  Group B: AdBlock users placed in the control group //                          - 'control'
    //  Group C: AdBlock users placed in the experiment group, opted in to Google Ads. - 'experiment-opt-in'
    //  Group D: AdBlock users placed in the experiment group, opted out of Google Ads.- 'experiment-opt-out'
    if (this.userWantsTextAds()) {
      return 'experiment-opt-in';
    }
    else {
      return (Math.random() > 0.5) ? 'control' : 'experiment-opt-out';
    }
  },
  userIsInExperiment: function() {
    var group = getUserGroup();
    return (group === 'experiment-opt-in' || group === 'experiment-opt-out');
  },
  userWantsTextAds: function() {
    if (get_settings().show_google_search_text_ads) {
      return true;
    }
    if (this.hasGoogleArgentinaSubscription()) {
      return true;
    }
    if (page_is_whitelisted('https://www.google.com/')) {
      return true;
    }
    return false;
  },
  hasGoogleArgentinaSubscription: function() {
    // TODO: implement
    return false;
  },
  ensureUserGroupIsSet: function() {
    if (!this.getUserGroup()) {
      this.setUserGroup(this.determineUserGroup());
    }
  },
  ignoreUserIfGroupChanged: function() {
    var group = this.getUserGroup();
    if(group === 'control' || group === 'ignored') {
      return;
    }
    var should_be_opted_in = this.userWantsTextAds();
    var is_opted_in = (group === 'experiment-opt-in');

    if(should_be_opted_in !== is_opted_in) {
      this.setUserGroup('ignored');
    }
  },
  modifyRequestHeaders: function(details) {
    var headers = details.requestHeaders || [];
    if (this.getUserGroup() === 'experiment-opt-in') {
      headers.push({name: 'X-AdBlock-Prefs', value: 'type:text'});
    } else if (this.getUserGroup() === 'experiment-opt-out') {
      headers.push({name: 'X-AdBlock-Prefs', value: 'none'});
    }

    return {
      requestHeaders: headers
    };
  },
  // experimentURLs: ['http://*.google.com/*', 'https://*.google.com/*'] // TODO: update to cover all Google search URLs
  experimentURLs: ['http://code.getadblock.com/tmp/*']
};

// Top-level function; reachable by BGcall()
function adDataUserGroup() { return adData.getUserGroup(); }

chrome.webRequest.onBeforeSendHeaders.addListener(
  function(details) { return adData.modifyRequestHeaders(details); },
  {urls: adData.experimentURLs},
  ["blocking", "requestHeaders"]
);
