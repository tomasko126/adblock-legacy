//cache a reference to window.confirm
//so that web sites can not clobber the default implementation
var abConfirm = window.confirm;
// Return the ElementType element type of the given element.
function typeForElement(el) {
  // TODO: handle background images that aren't just the BODY.
  switch (el.nodeName.toUpperCase()) {
    case 'INPUT':
    case 'IMG': return ElementTypes.image;
    case 'SCRIPT': return ElementTypes.script;
    case 'OBJECT':
    case 'EMBED': return ElementTypes.object;
    case 'VIDEO':
    case 'AUDIO':
    case 'SOURCE': return ElementTypes.media;
    case 'FRAME':
    case 'IFRAME': return ElementTypes.subdocument;
    case 'LINK':
      // favicons are reported as 'other' by onBeforeRequest.
      // if this is changed, we should update this too.
      if (/(^|\s)icon($|\s)/i.test(el.rel))
        return ElementTypes.other;
      return ElementTypes.stylesheet;
    case 'BODY': return ElementTypes.background;
    default: return ElementTypes.NONE;
  }
}

// If url is relative, convert to absolute.
function relativeToAbsoluteUrl(url) {
  // Author: Tom Joseph of AdThwart

  if (!url)
    return url;

  // If URL is already absolute, don't mess with it
  if (/^[a-zA-Z\-]+\:/.test(url))
    return url;

  if (url[0] == '/') {
    // Leading // means only the protocol is missing
    if (url[1] && url[1] == "/")
      return document.location.protocol + url;

    // Leading / means absolute path
    return document.location.protocol + "//" + document.location.host + url;
  }

  // Remove filename and add relative URL to it
  var base = document.baseURI.match(/.+\//);
  if (!base)
    return document.baseURI + "/" + url;
  return base[0] + url;
}

//Do not make the frame display a white area
//Not calling .remove(); as this causes some sites to reload continuesly
function removeFrame(el) {
  var parentEl = el.parentNode;
  var cols = ((parentEl.getAttribute('cols') || "").indexOf(',') > 0);
  if (!cols && (parentEl.getAttribute('rows') || "").indexOf(',') <= 0)
    return;
  // Figure out which column or row to hide
  var index = 0;
  while (el.previousElementSibling) {
    index++;
    el = el.previousElementSibling;
  }
  // Convert e.g. '40,20,10,10,10,10' into '40,20,10,0,10,10'
  var attr = (cols ? 'cols' : 'rows');
  var sizes = parentEl.getAttribute(attr).split(',');
  sizes[index] = "0";
  parentEl.setAttribute(attr, sizes.join(','));
}

// Remove an element from the page.
function destroyElement(el, elType) {
  if (el.nodeName == "FRAME") {
    removeFrame(el);
  }
  else if (elType != ElementTypes.script) {
    // There probably won't be many sites that modify all of these.
    // However, if we get issues, we might have to set the location and size
    // via the css properties position, left, top, width and height
    el.style.setProperty("display", "none", "important");
    el.style.setProperty("visibility", "hidden", "important");
    el.style.setProperty("opacity", "0", "important");
    var w = (el.width === undefined ? -1 : el.width);
    var h = (el.height === undefined ? -1 : el.height);
    el.style.setProperty("background-position", w + "px " + h + "px");
    el.setAttribute("width", 0);
    el.setAttribute("height", 0);
  }
}

// Add style rules hiding the given list of selectors.
function block_list_via_css(selectors) {
  if (!selectors || selectors.length === 0)
    return;
  // Issue 6480: inserting a <style> tag too quickly ignored its contents.
  // Use ABP's approach: wait for .sheet to exist before injecting rules.
  var css_chunk = document.createElement("style");
  css_chunk.type = "text/css";
  // Documents may not have a head
  (document.head || document.documentElement).insertBefore(css_chunk, null);

  function fill_in_css_chunk() {
    if (!css_chunk.sheet) {
      window.setTimeout(fill_in_css_chunk, 0);
      return;
    }
    var GROUPSIZE = 1000; // Hide in smallish groups to isolate bad selectors
    for (var i = 0; i < selectors.length; i += GROUPSIZE) {
      var line = selectors.slice(i, i + GROUPSIZE);
      var rule = line.join(",") + " { display:none !important; visibility: none !important; orphans: 4321 !important; }";
      css_chunk.sheet.insertRule(rule, 0);
    }
  }
  fill_in_css_chunk();
}

// Log matched selectors and save them into selectors cache
function logMatchedElements(data, node, hide) {
  var selectors = data.selectors || data._cachedSelectors;
  if (!selectors) return;

  var matchedSelectors = [];
  selectors.
    filter(function(selector) { return node.querySelector(selector); }).
    forEach(function(selector) {
      if (getComputedStyle(document.querySelector(selector)).display !== "none") {
          matchedSelectors.push(selector);
      }
      if (data.settings.debug_logging) {
        var matches = "";
        var elems = node.querySelectorAll(selector);
        for (var i=0; i<elems.length; i++) {
          var el = elems[i];
          matches += "        " + el.nodeName + "#" + el.id + "." + el.className + "\n";
        }
        BGcall("debug_report_elemhide", selector, matches);
      }
    });
  console.log("Matched elements: ", matchedSelectors);

  if (hide && matchedSelectors.length > 0) {
    block_list_via_css(matchedSelectors);
  }
  BGcall("setSelectors", document.location.href, matchedSelectors);
}

function handleABPLinkClicks() {
  // Subscribe to the list when you click an abp: link
  var elems = document.querySelectorAll('[href^="abp:"], [href^="ABP:"]');
  var abplinkhandler = function(event) {
    event.preventDefault();
    var searchquery = this.href.replace(/^.+?\?/, '?');
    if (searchquery) {
      var queryparts = parseUri.parseSearch(searchquery);
      var loc = queryparts.location;
      var reqLoc = queryparts.requiresLocation;
      var reqList = (reqLoc ? "url:" + reqLoc : undefined);
      var title = queryparts.title;
      BGcall('translate', "subscribeconfirm", (title || loc), function(translatedMsg) {
        if (abConfirm(translatedMsg)) {
          BGcall("subscribe", {id: "url:" + loc, requires: reqList, title: title});
          // Open subscribe popup
          if (SAFARI) {
            // In Safari, window.open() cannot be used
            // to open a new window from our global HTML file
            window.open(chrome.extension.getURL('pages/subscribe.html?' + loc),
                        "_blank",
                        'scrollbars=0,location=0,resizable=0,width=450,height=150');
          } else {
            BGcall("launch_subscribe_popup", loc);
          }
        }
      });
    }
  };
  for (var i=0; i<elems.length; i++) {
    elems[i].addEventListener("click", abplinkhandler, false);
  }
}

// Mutation Observer, which checks whether created node
// and it's children should be hidden or not
function observeChanges(data) {
    // Select the target node
    var target = document.body || document.documentElement;

    // Create an observer instance
    var mutationObserver = window.MutationObserver || window.WebKitMutationObserver;

    if (target && mutationObserver) {
        new mutationObserver(function(info) {
            for (var i=0; i<info.length; i++) {
                if (info[i].addedNodes) {
                    for (var j=0; j<info[i].addedNodes.length; j++) {
                      var element = info[i].addedNodes[j];
                      if (element.nodeType === Node.ELEMENT_NODE &&
                          element.nodeName !== "STYLE" &&
                          element.nodeName !== "SCRIPT" &&
                          element.nodeName !== "AUDIO") {
                        logMatchedElements(data, element, true);
                      }
                    }
                }
            }
        }).observe(target, {
            childList: true,
            attributes: true
        });
    }
}

// Called at document load.
// inputs:
//   startPurger: function to start watching for elements to remove.
//   stopPurger: function to stop watch for elemenst to remove, called in case
//               AdBlock should not be running.
//   success?: function called at the end if AdBlock should run on the page.
function adblock_begin(inputs) {

  if (document.location.href === 'about:blank') // Safari does this
    return;
  if (document.location.href === 'topsites://') // Safari does this
    return;
  if (document.location.href === 'favorites://') // Safari does this
    return;


  if (!(document.documentElement instanceof HTMLElement))
    return; // Only run on HTML pages

  if (typeof before_ready_bandaids === "function") {
        before_ready_bandaids("new");
  }

  inputs.startPurger();

  var opts = { domain: document.location.hostname, url: document.location.href };

  BGcall('get_content_script_data', opts, function(data) {
    if (data && data.settings && data.settings.debug_logging)
      logging(true);

    inputs.handleHiding(data);

    if (!data.running) {
      inputs.stopPurger();
      return;
    }
    console.log("DATA: ", data);

    onReady(function() {
      // Chrome doesn't load bandaids.js unless the site needs a bandaid.
      if (typeof run_bandaids === "function") {
        run_bandaids("new");
      }
      if (data.settings.experimental_hiding && data.hiding) {
        if (data._cachedSelectors) {
          console.log("onready::cached selectors received", data._cachedSelectors);
          observeChanges(data);
          logMatchedElements(data, document, true);
        } else {
          logMatchedElements(data, document, false);
        }
      }
      handleABPLinkClicks();
    });

    if (inputs.success) inputs.success();
  });
}