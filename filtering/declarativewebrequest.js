
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

// TODO: 
// - don't target AdBlock's own requests.
// - add RegEx cleanup / parsing
// - add document whitelisting
// - add resource (other - not document or elemhide) whitelisting
// - add unit tests

DeclarativeWebRequest = (function() {
  var toResourceType = {
    'document' : 'document',
    'image': 'image',
    'stylesheet': 'style-sheet',
    'script': 'script',
    'font': 'font',
    'xmlhttprequest': 'raw',
    'svg-document' : 'svg-document',
    //'object': 'object',
    //'subdocument': 'sub_frame',
    // object_subrequest: renamed to 'object' by normalizer, as above
    'media': 'media',
    //'other': 'other',
    'popup': 'popup',
    // 'elemhide': special cased
  };
  whitelistOnlyFilters = [];
  elementWhitelistFilters = [];
  documentWhitelistFilters = [];
  elemhideSelectorExceptions = {};
  
  var createDefaultRule = function() {
    var rule = {};
    rule.action = {};
    rule.action.type = "block";
    rule.trigger = {};
    rule.trigger["url-filter"] = "^https?://.*";
    return rule;    
  };
  
  var addDomainsToRule = function(filter, rule) {
    var domains = getDomains(filter);
    if (domains.excluded.length > 0) {
      rule.trigger["unless-domain"] = domains.excluded;
    }
    //since the global / ALL domain is included in the 'included' array, check for something other than undefined in the zero element
    if (domains.included.length > 0 && domains.included[0] !== undefined) {
      rule.trigger["if-domain"] = domains.included;
    }    
  };
  
  // Adds third/first party options to the rule
  var addThirdParty = function(filter, rule) {
    if (filter._options & FilterOptions.THIRDPARTY)
      rule.trigger["load-type"] = "third-party";
    if (filter._options & FilterOptions.FIRSTPARTY)
      rule.trigger["load-type"] = "first-party";
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

    if (_isPageLevel(filter)) {
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
  };

  // Returns true if |filter| is of type $document or $elemhide
  var _isPageLevel = function(filter) {
    var pageLevelTypes = (ElementTypes.elemhide | ElementTypes.document);
    return filter._allowedElementTypes & pageLevelTypes;
  };

  // Returns an array of resource types that should be checked by rules for
  // filters with the given allowedElementTypes.
  var getResourceTypesByElementType = function(elementTypes) {
    var map = {};
    for (var name in toResourceType) {
      if (elementTypes & ElementTypes[name]) {
        map[toResourceType[name]] = true;
      }
    }
    var result = [];
    for (var k in map) {
      result.push(k);
    }
    return result;
  };  
  
  //parse and clean up the filter's RegEx to meet WebKit's requirements.
  //TODO
  var getURLFilterFromFilter = function(filter) {
     return "^https?://.*";
  }
//
//  var preProcessWhitelistFilters = function(whitelistFilters){
//    console.log("whitelistFilters.length ", whitelistFilters.length);
//    for (var inx = 0; inx < whitelistFilters.length; inx++) {
//      var filter = whitelistFilters[inx];
//      if (filter._allowedElementTypes &
//          (ElementTypes.script |
//           ElementTypes.image |
//           ElementTypes.stylesheet |
//           ElementTypes.object |
//           ElementTypes.subdocument |
//           ElementTypes.object_subrequest |
//           ElementTypes.media |
//           ElementTypes.other |
//           ElementTypes.xmlhttprequest)) {
//        whitelistOnlyFilters.push(filter);
//      }
//      if (filter._allowedElementTypes & ElementTypes.elemhide) {
//        elementWhitelistFilters.push(filter);
//      }
//      if (filter._allowedElementTypes & ElementTypes.document) {
//        documentWhitelistFilters.push(filter);
//      }
//    }
//
//    console.log("whitelistOnly.length ", whitelistOnlyFilters.length);
//    console.log("elementWhitelistFilters.length ", elementWhitelistFilters.length);
//    console.log("documentWhitelistFilters.length ", documentWhitelistFilters.length);
//
//  }
//  var preProcessSelectorFilters = function(selectorFilters){
//    console.log("selectorFilters.length ", selectorFilters.length);
//    for (var inx = 0; inx < selectorFilters.length; inx++) {
//      var filter = selectorFilters[inx];
//      var filterDomains = getDomains(filter);
//      if (filterDomains.included.length > 0 && filterDomains.included[0] !== undefined) {
//      	if (!elemhideSelectorExceptions[filter.selector]) {
//    		  elemhideSelectorExceptions[filter.selector] = [];
//        }
//        elemhideSelectorExceptions[filter.selector] = elemhideSelectorExceptions[filter.selector].concat(filterDomains.included);
//        console.log("filter ", filter, filterDomains );
//      }
//    }
//    console.log("elemhideSelectorExceptions ", elemhideSelectorExceptions);
//
//  }


  // Return the rule required to represent this PatternFilter in Safari blocking syntax.
  var getRule = function(filter) {
    var rule = createDefaultRule();
    rule.trigger["url-filter"]  =  getURLFilterFromFilter(filter);
    rule.trigger["resourceType"] = getResourceTypesByElementType(filter._allowedElementTypes);
    addDomainsToRule(filter, rule);  

    // Special cases:
    // 1. $document requires a second rule to cancel all lower-level rules.
    // 2. $domain=~x requires special rules cancelling the normal domain rules.
//
//    if (filter._allowedElementTypes & ElementTypes.document) {
//      rules.push({
//        priority: priority,
//        trigger: _getDocumentOverrideConditions(filter),
//        action: [ ]
//      });
//    } else if (domains.excluded.length > 0) {
//      var tag = "tag" + _nextTagNumber++;
//      rules[0].tags = [ tag ];
//      rules.push({
//        priority: priority + 1,
//        trigger: _getConditions(filter, domains.excluded),
//        action: [ ]
//      });
//    }
  };
  // Return the rule (JSON) required to represent this Selector Filter in Safari blocking syntax.
  var createSelectorRule = function(filter) {
    var rule = createDefaultRule();
    rule.action.selector = _parseSelector(filter.selector);
    rule.action.type = "css-display-none";
    rule.trigger["url-filter"] = "^https?://.*";

    addDomainsToRule(filter, rule);   
    console.log("filter", filter, "rule", rule);
    return rule;
  };
  // Return the rule (JSON) required to represent this Selector Exception Filter in Safari blocking syntax.
  var createSelectorExceptionRule = function(filter) {
    var rule = createDefaultRule();
    rule.action = {"type": "ignore-previous-rules"};
    //TODO - add parsing of RegEx source
    rule.trigger = {"url-filter": filter._rule.source};
    addDomainsToRule(filter, rule); 
    return rule;
  };

  // Returns false if the given filter cannot be handled Safari 9 content blocking.
  var _isSupported = function(filter) {
    return !(filter._allowedElementTypes & ElementTypes.popup)
  };

  // Remove any characters from the filter lists that are not needed, such as |##| and |.|
  var _parseSelector = function(selector) {
    if (selector.indexOf('##') === 0) {
      selector = selector.substring(2, selector.length);
    }
    return selector;
  };

  var recordSelectorException = function (filter) {

  }

  return {
    // Registers rules for the given list of PatternFilters and SelectorFilters,
    // clearing any existing rules.
    register: function(patternFilters, whitelistFilters, selectorFilters, malwareDomains) {
//      preProcessWhitelistFilters(whitelistFilters);
      console.log("malwareDomains", malwareDomains);
      var rules = [];
      selectorFilters.forEach(function(filter) {
        //step 1, add all of the hiding filters (CSS selectors)
        if (_isSupported(filter)) {
          rules.push(createSelectorRule(filter));
        }
      });
      whitelistFilters.forEach(function(filter) {
        //step 2, now add only the $elemhide filters
        if (filter._allowedElementTypes & ElementTypes.elemhide) {
          rules.push(createSelectorExceptionRule(filter));
        }
      });
      patternFilters.forEach(function(filter) {
        //step 3, now add the blocking rules
        if (_isSupported(filter)) {
          rules.push(getRule(filter));
        }
      });
      //step 4, now add malware domains as one blocking rule (if there are malware domains)
      if (malwareDomains && malwareDomains.length > 0) {
        var rule = createDefaultRule();
        rule.trigger["if-domain"] = malwareDomains;
        rules.push(rule);
      }
      //step 5, add all $document
      whitelistFilters.forEach(function(filter) {
//        if (filter._allowedElementTypes & ElementTypes.elemhide) {
//          console.log("whitelist filter (entire document) ", filter,  filter._options, filter._allowedElementTypes);
//        }
//        rules.push(getRules(filter));
      });
      //step 6, add other whitelist rules
      whitelistFilters.forEach(function(filter) {
//        if (!(filter._allowedElementTypes & ElementTypes.elemhide)) {
//           console.log("whitelist filter (unkown) ", filter,  filter._options, filter._allowedElementTypes);
//        }
//        rules.push(getRules(filter));
      });      
      console.log("about to save rules  ", rules.length);
      try {
        safari.extension.setContentBlocker(rules);
      } catch(ex) {
        console.log("exception saving rules", ex);
      }
    },
  };
})();
