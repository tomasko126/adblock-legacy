// If the background image is an ad, remove it.
function blockBackgroundImageAd() {
  var bgImage = getComputedStyle(document.body)["background-image"] || "";
  var match = bgImage.match(/^url\((.+)\)$/);
  if (!match)
    return;
  var hiddenImage = document.createElement("img");
    hiddenImage.src = match[1];
    hiddenImage.setAttribute("width", "0");
    hiddenImage.setAttribute("height", "0");
    hiddenImage.style.setProperty("display", "none");
    hiddenImage.style.setProperty("visibility", "hidden");
  document.body.appendChild(hiddenImage);
  window.setTimeout(function() {
    if (hiddenImage.style.opacity === "0") {
      document.body.style.setProperty("background-image", "none");
    }
    document.body.removeChild(hiddenImage);
  }, 1);
}

function disablePushstateYouTube() {
  if (document.location.hostname === "www.youtube.com") {
    var script = document.createElement("script");
    script.type = "application/javascript";
    script.async = false;
    script.textContent = "history.pushState = undefined;";
    document.documentElement.appendChild(script);
    document.documentElement.removeChild(script);
  }
}

// Remove background images and purged elements.
// Return true if the element has been handled.
function weakDestroyElement(el, elType) {
  if (elType & ElementTypes.background) {
    el.style.setProperty("background-image", "none", "important");
    return true;
  }
  else if (elType == ElementTypes.script) {
    return true; // nothing to do
  }
  else {
    return false; // not handled by this function
  }
};

beforeLoadHandler = function(event) {
  var el = event.target;
  if (!el.nodeName) return; // issue 6256
  // Cancel the load if canLoad is false.
  var elType = typeForElement(el);
  var data = { 
    url: relativeToAbsoluteUrl(event.url),
    elType: elType,
    frameDomain: document.location.hostname,
    frameInfo: chrome._tabInfo.gatherFrameInfo()
  };
  if (!safari.self.tab.canLoad(event, data)) {

    // Work around bugs.webkit.org/show_bug.cgi?id=65412
    // Allow the resource to load, but hide it afterwards.
    // Probably a normal site will never reach 250.
    beforeLoadHandler.blockCount++;
    if (beforeLoadHandler.blockCount > 250) {
      log("ABORTING: blocked over 250 requests, probably an infinite loading loop");
      beforeLoadHandler.blockCount = 0;
    } else
      event.preventDefault();

    if (!weakDestroyElement(el, elType))
      destroyElement(el, elType);
  }
}
beforeLoadHandler.blockCount = 0;

adblock_begin({
  startPurger: function() { 
    document.addEventListener("beforeload", beforeLoadHandler, true);
    // If history.pushState is available, YouTube uses the history API
    // when navigation from one video to another, and tells the flash player with JavaScript
    // which video and which ads to show next, bypassing our flashvars rewrite code.
    // So we disable history.pushState on pages with YouTube's flash player,
    // this will for the site to use to a page reload.
    document.addEventListener("beforeload", disablePushstateYouTube, true);
  },
  stopPurger: function() { 
    document.removeEventListener("beforeload", beforeLoadHandler, true);
  },
  handleHiding: function(data) {
    if (data.hiding)
      block_list_via_css(data.selectors);
  },
  success: function() {
    onReady(function() { blockBackgroundImageAd(); });

    // Add entries to right click menu of non-whitelisted pages.
    window.addEventListener("contextmenu", function(event) {
      safari.self.tab.setContextMenuEventUserInfo(event, true);
    }, false);
  }
});
