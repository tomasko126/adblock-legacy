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
  this._nextTagNumber = 1;
};

DeclarativeWebRequest.prototype = {
  // Registers declarative blocking rules for the given list of PatternFilters,
  // clearing any existing rules.
  register: function(filters) {
    var rules = [];

    var that = this;
    filters.forEach(function(filter) {
      rules.push.apply(rules, that._getRules(filter));
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

  // Return the rules required to represent this PatternFilter in DWR syntax.
  _getRules: function(filter) {
    if (!this._isSupported(filter))
      return [];

    var priority = this._getPriority(filter);
    var domains = this._getDomains(filter);

    var rules = [];
    rules.push({
      priority: priority,
      conditions: this._getConditions(filter, domains.included),
      actions: this._getActions(filter)
    });

    // Two special cases:
    // 1. $document requires a second rule to cancel all lower-level rules.
    // 2. $domain=~x requires special rules cancelling the normal domain rules.

    if (filter._allowedElementTypes & ElementTypes.document) {
      rules.push({
        priority: priority,
        conditions: this._getDocumentOverrideConditions(filter),
        actions: [ new dwr.IgnoreRules({ lowerPriorityThan: priority }) ]
      });
    }
    else if (domains.excluded.length > 0) {
      var tag = "tag" + this._nextTagNumber++;
      rules[0].tags = [ tag ];
      rules.push({
        priority: priority + 1,
        conditions: this._getConditions(filter, domains.excluded),
        actions: [ new dwr.IgnoreRules({ hasTag: tag }) ]
      });
    }
    return rules;
  },

  // Returns false if the given filter cannot be handled by DWR rules.
  _isSupported: function(filter) {
    if (filter._allowedElementTypes & ElementTypes.popup)
      return false;
    return true;
  },

  // Return an array of conditions specifically for cancelling all lower-priority
  // rules than the rule created for the given $document filter.
  _getDocumentOverrideConditions: function(filter) {
    // The normal conditions for a $document filter are
    // - when a main_frame request is made
    // - having a url matching the filter expression
    var result = this._getConditions(filter, [ undefined ])[0];
    // This override instead matches all page-level request types...
    var types = ElementTypes.DEFAULTTYPES;
    result.resourceType = this._getResourceTypesByElementType(types);
    // ...when the page URL matches the filter expression.
    result.firstPartyForCookiesUrl = result.url;
    delete result.url;
    return [ result ];
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
      // TODO: use more efficient urlFilter if possible (and if needed)
      condition.url = { urlMatches: filter._rule.source };
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

    // DWR strips domain=* from document (and elemhide) rules of the form
    // @@A$document,domain=B
    // because it has no way of saying "Match if the URL looks like A and also
    // looks like B."
    if (this._isPageLevel(filter)) {
      result.included.push(undefined);
      return result;
    }

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

    // $document
    if (filter._allowedElementTypes & ElementTypes.document)
      return [ smte("document") ];

    // whitelist
    var priority = this._getPriority(filter);
    return [ new dwr.IgnoreRules({ lowerPriorityThan: priority }) ];
  },

  // Returns an array of resource types that should be checked by rules for
  // this filter.
  _getResourceTypes: function(filter) {
    if (this._isPageLevel(filter))
      return [ "main_frame" ];
    else
      return this._getResourceTypesByElementType(filter._allowedElementTypes);
  },

  // Returns an array of resource types that should be checked by rules for
  // filters with the given allowedElementTypes.
  _getResourceTypesByElementType: function(elementTypes) {
    var t = elementTypes;
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
