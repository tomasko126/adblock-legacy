
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
  var HTML_PREFIX = "^https?://";
  var REGEX_WILDCARD = ".*";
  //  allowed ASCII characters, except:
  //  x25 = NAK
  //  x2D = -
  //  x2E = .
  //  x30 - x39 = digits 0 - 9
  //  x41 - x5A = Upper case alpha
  //  x5F - _
  //  x61 - x7A = lower case alpha
  var allowedASCIIchars = "\\x00-\\x24\\x26-\\x2C\\x2F\\x3A-\\x40\\x5B-\\x5E\\x60\\x7B-\\x7F";
  whitelistAnyOtherFilters = [];
  elementWhitelistFilters = [];
  documentWhitelistFilters = [];
  elemhideSelectorExceptions = {};

  var createDefaultRule = function() {
    var rule = {};
    rule.action = {};
    rule.action.type = "block";
    rule.trigger = {};
    rule.trigger["url-filter"] = HTML_PREFIX + REGEX_WILDCARD;
    return rule;
  };

  // Adds third/first party options to the rule
  var addThirdParty = function(filter, rule) {
    if (filter._options & FilterOptions.THIRDPARTY)
      rule.trigger["load-type"] = "third-party";
    if (filter._options & FilterOptions.FIRSTPARTY)
      rule.trigger["load-type"] = "first-party";
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
    var pageLevelTypes = (ElementTypes.elemhide | ElementTypes.document);
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
  	var urlFilter;
    //check if there is any non-ASCII characters in the URL,
    //if so, convert them to ASCII
		urlFilter = filter._rule.source.replace(
			/^(\|\||\|?https?:\/\/)([\w\-.*\u0080-\uFFFF]+)/i,
			function (match, prefix, domain) {
				return prefix + punycode.toASCII(domain);
			});
		//urlFilter = toRegExp(filter._rule.source);
		urlFilter = filter._rule.source
  	// make sure to limit rules to to HTTP(S) URLs (if not already limited)
  	if (!/^(\^|http)/i.test(urlFilter)) {
  		urlFilter = HTML_PREFIX + REGEX_WILDCARD + urlFilter;
    }
  	return urlFilter;
  }

function toRegExp(text) {
	var parsedRegEx = "";
	var lastIndex = text.length - 1;
	for (var inx = 0; inx < text.length; inx++) {
		var aChar = text.charAt(inx);
		switch (aChar) {
			case "*":
        //for any 'zero or more' quantifiers that occur
        //in any location but the first or last position, add a match any single character.
				if (parsedRegEx.length > 0 &&
				    inx < lastIndex &&
				    text[inx + 1] != "*") {
					parsedRegEx += ".*";
			  }
				break;
			case "^":
			  //convert the separator character (anything but a letter, a digit, or one of the following: _ - . %)
				if (inx === lastIndex) {
					parsedRegEx += "(?![^" + allowedASCIIchars + "])";
				} else {
					parsedRegEx += "[" + allowedASCIIchars + "]";
			  }
				break;
			case "|":
			  //if the first character is |,
			  // add the RegEx begining of line marker
				if (inx === 0) {
					parsedRegEx += "^";
					break;
				}
			  //if the last character is |,
			  // add the RegEx end of line marker
				if (inx === lastIndex) {
					parsedRegEx += "$";
					break;
				}
			  //if the first and second character is |,
			  // add a restriction for |HTTP(S)://|
				if (inx === 1 && text[0] === "|") {
					parsedRegEx += HTML_PREFIX;
					break;
				}
			case ".":
			case "+":
			case "?":
			case "$":
			case "{":
			case "}":
			case "(":
			case ")":
			case "[":
			case "]":
			case "\\":
			//add RegEx escape for all of the above characters
				parsedRegEx += "\\";
			default:
			  //add the character
				parsedRegEx += aChar;
		}
	}
  //console.log("text", text, "parsedRegEx", parsedRegEx);
	return parsedRegEx;
}


  var preProcessWhitelistFilters = function(whitelistFilters){
    console.log("whitelistFilters.length ", whitelistFilters.length);
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
    return !((filter._allowedElementTypes & ElementTypes.SUBDOCUMENT) ||
             (filter._allowedElementTypes & ElementTypes.OBJECT) ||
    		     (filter._allowedElementTypes & ElementTypes.OBJECT_SUBREQUEST));
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
    register: function(patternFilters, whitelistFilters, selectorFilters, malwareDomains) {
      preProcessWhitelistFilters(whitelistFilters);
//      console.log("malwareDomains", malwareDomains);
      var rules = [];
      //step 1, add all of the hiding filters (CSS selectors)
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
