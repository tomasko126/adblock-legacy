
// Safari ToDo:
// how to clear - submit empty rules
// re-add all rules on browser start up? No, need to add check if firstRun vs. start up vs. filterList updated.
// how to add one rule to existing rules, re-submit all rules? Yes
// how to remove one rule from existing rules, re-submit all rules with the one to delete now removed? Yes
// expanded - how to whitelist a domain / site - WebKit to provide new API
// how to pause feature - WebKit to provide new API
//
// consideration:
// sorting/ordering of rules by type (priority) for performance
//
// should we support Safari 8-? (no)
// TypeError: undefined is not an object (evaluating '_myfilters.blocking.whitelist')  page_is_whitelisted in background.js uses _myfilters.blocking

// TODO:
// - check if pre-roll ads are blocked on YouTube
// -  if so, remove bandaids.js and the ClickToFlash compatibility mode option
// - remove 'pause' from popup menu
// - don't target AdBlock's own requests.
// - add RegEx cleanup / parsing
// - add document whitelisting
// - add resource (other - not document or elemhide) whitelisting
// - add unit tests

// test scenario
// in Safari & Chrome - Malware Domains - adding, removing filter list, browser start up with and without subscription


DeclarativeWebRequest = (function() {
  var HTML_PREFIX = "https?://"
  var REGEX_WILDCARD = ".*"
  var pageLevelTypes = (ElementTypes.elemhide | ElementTypes.document);
    //  allowed ASCII characters, except:
    //  x25 = NAK
    //  x2D = -
    //  x2E = .
    //  x30 - x39 = digits 0 - 9
    //  x41 - x5A = Upper case alpha
    // x5F - _
    // x61 - x7A = lower case alpha
  var ALLOWED_ASCII_CHARS = "\\x00-\\x24\\x26-\\x2C\\x2F\\x3A-\\x40\\x5B-\\x5E\\x60\\x7B-\\x7F";
  var whitelistAnyOtherFilters = [];
  var elementWhitelistFilters = [];
  var documentWhitelistFilters = [];
  var elemhideSelectorExceptions = {};

  // Adds third/first party options to the rule
  var addThirdParty = function(filter, rule) {
    if (filter._options & FilterOptions["THIRDPARTY"]) {
      rule["trigger"]["load-type"] = "third-party"
    }
    if (filter._options & FilterOptions["FIRSTPARTY"]) {
      rule["trigger"]["load-type"] = "first-party"
    }
  };

  // Add the include / exclude domains to a rule
  // Note:  some filters will have both include and exclude domains, which the content blocking API doesn't allow,
  //        so we only add the exclude domains when there isn't any include domains.
  var addDomainsToRule = function(filter, rule) {
    var domains = getDomains(filter);
    //since the global / ALL domain is included in the 'included' array, check for something other than undefined in the zero element
    if (domains.included.length > 0 && domains.included[0] !== undefined) {
      rule.trigger["if-domain"] = domains.included;
    } else if (domains.excluded.length > 0) {
      rule.trigger["unless-domain"] = domains.excluded;
    }
  };

  // Returns an object containing .included and .excluded lists of domains for
  // the given Filter.  If the Filter is of the form $domain=~x[,~x2,...] then
  // add |undefined| to the .included list to represent the implied global
  // domain matched by the filter.
  var getDomains = function(filter) {
    var result = {
      included: [],
      excluded: []
    };
    if (isPageLevel(filter)) {
      result.included.push(undefined);
      return result;
    }
    var has = filter._domains.has;
    if (has[DomainSet.ALL]) {
      result.included.push(undefined);
    }
    for (var d in has) {
      if (d === DomainSet.ALL) {
        continue;
      }
      result[ has[d] ? 'included' : 'excluded' ].push(d.toLowerCase());
    }
    return result;
  };

  // Returns true if |filter| is of type $document or $elemhide
  var isPageLevel = function(filter) {
    return filter._allowedElementTypes & pageLevelTypes;
  };

  // Returns an array of resource types that should be checked by rules for
  // filters with the given allowedElementTypes.
  var getResourceTypesByElementType = function(elementTypes) {
    var result = [];
  	if (elementTypes & ElementTypes.image) {
  		result.push("image");
    }
  	if (elementTypes & ElementTypes.stylesheet) {
  		result.push("style-sheet");
    }
  	if (elementTypes & ElementTypes.script) {
  		result.push("script");
    }
  	if (elementTypes & ElementTypes.media) {
  		result.push("media");
  	}
  	if (elementTypes & ElementTypes.popup) {
  		result.push("popup");
  	}
  	if (elementTypes & (ElementTypes.xmlhttprequest | ElementTypes.other)) {
  		result.push("raw");
  	}
//    TODO-what to do about these types
//  	if (elementTypes & ElementTypes.FONT) {
//  		result.push("font");
//    }
//    if (elementTypes & ElementTypes.SUBDOCUMENT) {
//    		result.push("subdocument");
//    }
//    if (elementTypes & ElementTypes.OBJECT) {
//    		result.push("object");
//    }
//    if (elementTypes & ElementTypes.OBJECT_SUBREQUEST) {
//    		result.push("object-subrequest");
//    }
//    console.log("elementTypes", elementTypes, "result", result);
    return result;
  };

  //parse and clean up the filter's RegEx to meet WebKit's requirements.
  var getURLFilterFromFilter = function(filter) {
    //remove any whitespace
    filter._rule = filter._rule.trim()
    // make sure to limit rules to to HTTP(S) URLs (if not already limited)
    if (!/^(\^|http|\/http)/.test(filter._rule)) {
      filter._rule = HTML_PREFIX + REGEX_WILDCARD + filter._rule
    }
    return filter._rule
  }



  var preProcessWhitelistFilters = function(whitelistFilters){
    for (var inx = 0; inx < whitelistFilters.length; inx++) {
      var filter = whitelistFilters[inx];
      if (isSupported(filter) &&
          (filter._allowedElementTypes &
           (ElementTypes.script |
            ElementTypes.image |
            ElementTypes.stylesheet |
            ElementTypes.object |
            ElementTypes.subdocument |
            ElementTypes.object_subrequest |
            ElementTypes.media |
            ElementTypes.other |
            ElementTypes.xmlhttprequest))) {
        whitelistAnyOtherFilters.push(filter);
      }
      if (isSupported(filter) && (filter._allowedElementTypes & ElementTypes.elemhide)) {
        elementWhitelistFilters.push(filter);
      }
      if (isSupported(filter) && (filter._allowedElementTypes & ElementTypes.document)) {
        documentWhitelistFilters.push(filter);
      }
    }
    console.log("whitelistOnly.length ", whitelistAnyOtherFilters.length);
    console.log("elementWhitelistFilters.length ", elementWhitelistFilters.length);
    console.log("documentWhitelistFilters.length ", documentWhitelistFilters.length);
  }


  var createDefaultRule = function() {
    var rule = {};
    rule.action = {};
    rule.action.type = "block";
    rule.trigger = {};
    rule.trigger["url-filter"] = HTML_PREFIX + REGEX_WILDCARD;
    return rule;
  };

  // Return the rule required to represent this PatternFilter in Safari blocking syntax.
  var getRule = function(filter) {
    var rule = createDefaultRule();
    rule.trigger["url-filter"]  =  getURLFilterFromFilter(filter);
    rule.trigger["resource-type"] = getResourceTypesByElementType(filter._allowedElementTypes);
    addDomainsToRule(filter, rule);
    return rule;
  };
  // Return the rule (JSON) required to represent this Selector Filter in Safari blocking syntax.
  var createSelectorRule = function(filter) {
    var rule = createDefaultRule();
    rule.action.selector = parseSelector(filter.selector);
    rule.action.type = "css-display-none";
    addDomainsToRule(filter, rule);
    return rule;
  };
  // Return the rule (JSON) required to represent this $elemhide Whitelist Filter in Safari blocking syntax.
  var createElemhideIgnoreRule = function(filter) {
    var rule = createDefaultRule();
    rule.action = {"type": "ignore-previous-rules"};
    rule.trigger["url-filter"]  =  getURLFilterFromFilter(filter);
    rule.trigger["resource-type"] = getResourceTypesByElementType(filter._allowedElementTypes);
    addDomainsToRule(filter, rule);
    return rule;
  };

  // Return the rule (JSON) required to represent this Selector Filter in Safari blocking syntax.
  var createEmptySelectorRule = function() {
    rule = createDefaultRule()
    rule["action"]["type"] = "css-display-none"
    return rule
  }

  // Return the rule (JSON) required to represent this $document Whitelist Filter in Safari blocking syntax.
  var createDocumentIgnoreRule = function(filter) {
    var rule = createDefaultRule();
    rule.action = {"type": "ignore-previous-rules"};
    rule.trigger["url-filter"]  =  getURLFilterFromFilter(filter);
    rule.trigger["resource-type"] = getResourceTypesByElementType(filter._allowedElementTypes);
    addDomainsToRule(filter, rule);
    return rule;
  };
  // Return the rule (JSON) required to represent this Whitelist Filter in Safari blocking syntax.
  var createIgnoreRule = function(filter) {
    var rule = createDefaultRule();
    rule.action = {"type": "ignore-previous-rules"};
    rule.trigger["url-filter"]  =  getURLFilterFromFilter(filter);
    rule.trigger["resource-type"] = getResourceTypesByElementType(filter._allowedElementTypes);
    addDomainsToRule(filter, rule);
    return rule;
  };

  // Returns false if the given filter cannot be handled Safari 9 content blocking.
  var isSupported = function(filter) {
    if (!filter) {
      return false;
    } else if (!filter.hasOwnProperty('_allowedElementTypes')) {
      return true;
    } else {
      return !((filter._allowedElementTypes & ElementTypes.SUBDOCUMENT) ||
             (filter._allowedElementTypes & ElementTypes.OBJECT) ||
    		     (filter._allowedElementTypes & ElementTypes.OBJECT_SUBREQUEST));
    }
  };

  // Remove any characters from the filter lists that are not needed, such as |##| and |.|
  var parseSelector = function(selector) {
    if (selector.indexOf('##') === 0) {
      selector = selector.substring(2, selector.length);
    }
    return selector;
  };

  return {
    // Registers rules for the given list of PatternFilters and SelectorFilters,
    // clearing any existing rules.
    register: function( patternFilters, whitelistFilters, selectorFilters, selectorFiltersAll, malwareDomains) {
      preProcessWhitelistFilters(whitelistFilters);
//      console.log("malwareDomains", malwareDomains);
      var rules = [];
      //step 1a, add all of the generic hiding filters (CSS selectors)
      GROUPSIZE = 1000
      for (var i = 0; i < selectorFiltersAll.length; GROUPSIZE) {
        var start = i;
        var end = Math.min((i + GROUPSIZE), selectorFiltersAll.length);
        var selectorText = "";
        for (var j = start; j < end; j++) {
          filter = selectorFiltersAll[j];
          if (isSupported(filter)) {
            if (selectorText === "") {
              selectorText = parseSelector(filter.selector);
            } else {
              selectorText = selectorText + ", " + parseSelector(filter.selector);
            }
          }
        }

        theRule = createEmptySelectorRule();
        theRule["action"]["selector"] = selectorText;
        rules.push(theRule);
      }
      //step 1b, add all of the domain inclusive / exclusive hiding filters (CSS selectors)
      selectorFilters.forEach(function(filter) {
        if (isSupported(filter)) {
          rules.push(createSelectorRule(filter));
        }
      });
      //step 2, now add only the $elemhide filters
      elementWhitelistFilters.forEach(function(filter) {
        rules.push(createElemhideIgnoreRule(filter));
      });
      //step 3, now add the blocking rules
      patternFilters.forEach(function(filter) {
        if (isSupported(filter)) {
          var rule = getRule(filter);
          var is_valid = true;
          try {
            new RegExp(rule["trigger"]["url-filter"]);
          } catch(ex) {
            is_valid = False
          }
          if (is_valid) {
            rules.push(rule)
          }
        }
      });
      //step 4, now add malware domains as one blocking rule (if there are malware domains)
      if (malwareDomains && malwareDomains.length > 0) {
        var rule = createDefaultRule();
        rule.trigger["if-domain"] = malwareDomains;
        rules.push(rule);
      }
      //step 5, add all $document
      documentWhitelistFilters.forEach(function(filter) {
        rules.push(createDocumentIgnoreRule(filter));
      });
      //step 6, add other whitelist rules
      whitelistAnyOtherFilters.forEach(function(filter) {
        rules.push(createIgnoreRule(filter));
      });
      return rules;

    },
  };
})();
