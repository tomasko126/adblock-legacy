//only run this if the top / main page.
//we need this check because Safari currently does not allow us to control
//which documents this file is inject in, where Chrome does.
if (window.top === window) {
    NotificationOverlay = (function() {
        var divID = "_ABoverlay";
        var iframeID = "_ABiframe";
        var styleID = "_ABstyle";    

        chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
            if (request.command === 'showoverlay' &&
                request.overlayURL &&
                request.tabURL === document.location.href) {
                showOverlay(request.overlayURL);
                sendResponse({});
            }
        });
        //create the DIV and IFRAME and insert them into the DOM
        var showOverlay = function(iframeURLsrc) {
            //if the DIV and IFRAME already exist, don't add another one, just return
            if (document.getElementById(divID) &&
                document.getElementById(iframeID)) {
                return;
            }
            var notificationMin = 27;
            var mainBody = document.body;
            if (mainBody) {
                //create overlay DIV tag
                var overlayElement = document.createElement("div");
                overlayElement.id = divID;
                mainBody.insertBefore(overlayElement, mainBody.firstChild);
                window.addEventListener("resize", overlayResize);
                //create style element, so that our DIV tag isn't printed, if the user decides to print the page.
                var styleElement = document.createElement("style");
                styleElement.type = "text/css";
                styleElement.id = styleID;
                (document.head || document.documentElement).insertBefore(styleElement, null);
                styleElement.sheet.insertRule("@media print{ #_ABoverlay{ display:none } }", 0);
                styleElement.sheet.insertRule("#_ABoverlay{ display:block; top:0px; left:0px; width:100%; height:27px; position:fixed; z-index:2147483647 !important }", 0);
                styleElement.sheet.insertRule("#_ABiframe{ height:27px; border:0px }", 0);
                //create the iframe element, add it the DIV created above.
                var abFrame = document.createElement("iframe");
                abFrame.id = iframeID;
                var winWidth = calculateWindowWidth(window);
                abFrame.style.width = winWidth + "px";
                abFrame.scrolling = "no";
                if (SAFARI) {
                    overlayElement.appendChild(abFrame);
                    abFrame.src ='https://ping.getadblock.com' + iframeURLsrc;
                } else {
                    //CHROME browser allow us to load via AJAX
                    //so we'll try loading the contents of the iframe using an AJAX request first,
                    //this way we can capture the response code.
                    var frameRequest = new XMLHttpRequest();
                    frameRequest.onload = function() {
                        if (200 >= frameRequest.status && 400 > frameRequest.status) {
                            overlayElement.appendChild(abFrame);
                            abFrame.contentWindow.document.write(frameRequest.response); 
                        } else {
                            removeOverlay(); 
                        }
                    }
                    frameRequest.open('get', 'https://ping.getadblock.com' + iframeURLsrc);
                    frameRequest.onerror = function() { 
                        removeOverlay();
                    };
                    frameRequest.send();  
                }             
            }
        };
        
        var removeOverlay = function() {
            var overlayElement = document.getElementById(divID);
            if (overlayElement) {
                document.body.removeChild(overlayElement);
                window.removeEventListener("resize", overlayResize, !1);
            }
            var styleElement = document.getElementById(styleID);
            if (styleElement) {
                (document.head || document.documentElement).removeChild(styleElement);
            }
        };
        
        var overlayResize = function() {
            var overlayElement = document.getElementById(divID);
            var frameElement = document.getElementById(iframeID);
            if (overlayElement &&
                frameElement) {
                var a = calculateWindowWidth(window);
                overlayElement.style.width = a + "px";
                frameElement.style.width = a + "px"
            }
        };    
        
        var calculateWindowWidth = function(aWindow) {
            if (!aWindow) {
                return 0;
            }
            var calculatedWidth = aWindow.innerWidth;
            var aDoc = aWindow.document;
            if (!aDoc) {
                return 0;
            }
            if ("undefined" != typeof aDoc.body) {
                aWindow = aDoc.body
            } else if (aDoc.getElementById("main")) {
                aWindow = aDoc.getElementById("main");
            }
            var tempDiv = aDoc.getElementById("_AB_temp");
            if (null == tempDiv) {
                tempDiv = aDoc.createElement("div");
                tempDiv.id = "_AB_temp";
                tempDiv.style.cssText = "left:0px; right:0px; top:0px; height:0px; visibility:hidden";
                aWindow.appendChild(tempDiv);
            }
            var theStyle = getComputedStyleForElement("undefined" != typeof window && window ? window : aDoc.defaultView, aWindow);
            if (!theStyle) {
                return 0;
            }
            var marginLeft = parseInt(theStyle.marginLeft);
            var marginRight = parseInt(theStyle.marginRight);
            //calculate the width using the margins of the window
            0 < tempDiv.offsetWidth && (calculatedWidth = 0 < marginLeft || 0 < marginRight ? tempDiv.offsetWidth + marginRight + marginLeft : tempDiv.offsetWidth);
            aWindow.removeChild(tempDiv);
            return calculatedWidth;
        };
        
        var getComputedStyleForElement = function(parentEl, el) {
            if (!el) {
                return null;
            }
            if ("undefined" != typeof parentEl.getComputedStyle) {
                return parentEl.getComputedStyle(el);
            } else {
                el.currentStyle;
            }
        };
    })();        
}
