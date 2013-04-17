// TODO don't ship this without testing in Store privately that adding
// 'declarativeWebRequest' permission doesn't make existing stable channel
// users explode, nor existing beta channel users explode.
(function(window) {

var dwr = chrome.declarativeWebRequest;

/* 
* Known limitations:
*  - forcing the 'match_case' option for non-regex rules, since DWR rules are
*    case-sensitive.
*/

// TODO: don't target AdBlock's own requests.
DeclarativeWebRequest = function() {
  this._toResourceType = {
    'script': 'script',
    'image': 'image',
    // background: renamed to 'image' by normalizer, doesn't really exist.
    // Including it here just breaks unit tests for filters of type
    // $~image.
    'stylesheet': 'stylesheet',
    'object': 'object',
    'subdocument': 'sub_frame',
    // object_subrequest: renamed to 'object' by normalizer, as above
    'media': 'other',
    'other': 'other',
    'xmlhttprequest': 'xmlhttprequest',
    // 'document': special cased
    // 'elemhide': special cased
    // 'popup': not supported
  };
};

DeclarativeWebRequest.prototype = {
  // Registers declarative blocking rules for the given list of PatternFilters,
  // clearing any existing rules.
  register: function(filters) {
    var rules = [];

    var tagId = 1;
    var that = this;
    filters.forEach(function(filter) {
      rules.push.apply(rules, that._getRules(filter, "tag" + tagId++));
    });

    dwr.onRequest.removeRules();
    rules.splice(4000);
    dwr.onRequest.addRules(rules, function() {
      console.groupCollapsed("Added", rules.length, "rules");
      console.groupEnd();
      /*
      dwr.onRequest.getRules(null, function(rules) {
        rules.forEach(function(r) { console.log(r); });
        console.groupEnd();
      });
      */
    });

  },

  // Return the rules required to represent this filter in DWR syntax.
  // tagId: the tag ID to assign to each rule for this filter.
  _getRules: function(filter, tagId) {
    if (!this._isSupported(filter))
      return [];

    var priority = this._getPriority(filter);
    var domains = this._getDomains(filter);

    var rules = [];
    rules.push(
      {
        priority: priority,
        tags: [ tagId ],
        conditions: this._getConditions(filter, domains.included),
        actions: this._getActions(filter),
      }
    );
    if (domains.excluded.length === 0)
      return rules;
    rules.push(
      {
        priority: priority + 1,
        conditions: this._getConditions(filter, domains.excluded),
        actions: [ new dwr.IgnoreRules({ hasTag: tagId }) ],
      }
    );
    return rules;
  },

  // Returns false if the given filter cannot be handled by DWR rules.
  _isSupported: function(filter) {
    if (filter._allowedElementTypes & ElementTypes.popup)
      return false;
    return true;
  },

  // Return an array of conditions matching the given Filter, where each
  // condition is specific to one of the given domains.
  _getConditions: function(filter, domains) {
    var resourceType = this._getResourceTypes(filter);
    var tpfc = this._getThirdPartyForCookies(filter);
    var isPageLevel = this._isPageLevel(filter);
    return domains.map(function(domain) {

      var condition = {};
      if (resourceType)
        condition.resourceType = resourceType;
      if (tpfc !== undefined)
        condition.thirdPartyForCookies = tpfc;
      if (!isPageLevel && domain)
        condition.firstPartyForCookiesUrl = { hostSuffix: domain };
      // Page level filters examine the page URL, not the request URL.
      var target = isPageLevel ? 'firstPartyForCookiesUrl' : 'url';
      // TODO: use more efficient urlFilter if possible (and if needed)
      condition[target] = { urlMatches: filter._rule.source };
      condition.stages = [ "onBeforeRequest" ];
      return new dwr.RequestMatcher(condition);

    });
  },

  // Returns an object containing .included and .excluded lists of domains for
  // the given Filter.  If the Filter is of the form $domain=~x[,~x2,...] then
  // add |undefined| to the .included list to represent the implied global
  // domain matched by the filter.
  _getDomains: function(filter) {
    var result = {
      included: [],
      excluded: []
    };
    var has = filter._domains.has;
    if (has[DomainSet.ALL])
      result.included.push(undefined);
    for (var d in has) {
      if (d === DomainSet.ALL)
        continue;
      result[ has[d] ? 'included' : 'excluded' ].push(d);
    }
    return result;
  },

  // Returns true if |filter| is of type $document or $elemhide
  _isPageLevel: function(filter) {
    var pageLevelTypes = (ElementTypes.elemhide | ElementTypes.document);
    return filter._allowedElementTypes & pageLevelTypes;
  },

  // Returns the integer priority to assign to rules for this filter.
  _getPriority: function(filter) {
    if (!filter._isWhitelist)
      return 100; // blacklist
    if (this._isPageLevel(filter))
      return 300; // $elemhide/$document
    else 
    return 200;   // whitelist
  },

  // Returns the actions to perform for filters of this kind.
  _getActions: function(filter) {
    var smte = function(msg) { 
      return new dwr.SendMessageToExtension({ message: msg });
    };

    // blacklist
    if (!filter._isWhitelist)
      return [ new dwr.CancelRequest(), smte("block") ];

    // $elemhide
    if (filter._allowedElementTypes & ElementTypes.elemhide)
      return [ smte("elemhide") ];

    var priority = this._getPriority(filter);
    var ignore = new dwr.IgnoreRules({ lowerPriorityThan: priority });

    // $document
    if (filter._allowedElementTypes & ElementTypes.document)
      return [ ignore, smte("document") ];

    // whitelist
    return [ ignore ];
  },

  // Returns an array of resource types that should be checked by rules for
  // this filter.
  _getResourceTypes: function(filter) {
    var t = filter._allowedElementTypes;
    // $document and $elemhide, though applying to the page, need to create
    // DWR conditions that are matched on every resource request (so that they
    // can Ignore blacklisting rules that also match the request.)
    if (this._isPageLevel(filter))
      t = ElementTypes.DEFAULTTYPES;
    var map = {};
    for (var name in this._toResourceType) {
      if (t & ElementTypes[name])
        map[this._toResourceType[name]] = true;
    }
    var result = [];
    for (var k in map)
      result.push(k);
    return result;
  },

  // Returns whether this filter is specific to third/first party requests,
  // or undefined if neither is the case.
  _getThirdPartyForCookies: function(filter) {
    var o = filter._options;
    if (o & FilterOptions.THIRDPARTY)
      return true;
    if (o & FilterOptions.FIRSTPARTY)
      return false;
    return undefined; // no preference
  },
};

DeclarativeWebRequest.singleton = new DeclarativeWebRequest();

})(window);
