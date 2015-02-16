var notificationMin = 27;
var notificationMax = 200;
var iframeURLsrc;
var iframeRandom;
function showoverlay() {
    var mainBody = document.body;
    if (mainBody) {
        //create overlay DIV tag
        iframeRandom = Math.floor(1E8 * Math.random());
        var winWidth = getWindowWidth(window);
        document.body.scrollTop;
        var spacerElement = document.createElement("div");
        spacerElement.id = "ABtopspacer" + iframeRandom;
        var st = spacerElement.style;
        st.display = "block";
        st.top = "0px";
        st.left = "0px";
        st.width = "100%";
        st.height = notificationMin + "px";
        st.position = "fixed";
        st.zIndex = "1000000099";
        mainBody.insertBefore(spacerElement, mainBody.firstChild);
        window.addEventListener("resize", overlayresize, !1);
        //create style element, so that our DIV tag isn't printed, if the user decides to print the page.
        var styleElement = document.createElement("style");
        styleElement.type = "text/css";
        styleElement.styleSheet ? styleElement.styleSheet.cssText = "@media print{.ABframeoverlay{display:none}}" : styleElement.appendChild(document.createTextNode("@media print{.ABframeoverlay{display:none}}"));
        document.getElementsByTagName("head")[0].appendChild(styleElement);
        //create the iframe element, add it the DIV created above.
        var abFrame = document.createElement("iframe");
        abFrame.id = "ABiframe" + iframeRandom;
        //TODO - fix for prod
        //abFrame.src ='https://getadblock.com/' + iframeURLsrc;
        abFrame.src = 'http://localhost:8000/survey/' + iframeURLsrc;
        abFrame.style.height = notificationMin + "px";
        abFrame.style.width = winWidth + "px";
        abFrame.style.border = "0px";
        abFrame.scrolling = "no";
        spacerElement.appendChild(abFrame);
    }
}

function overlayresize() {
    if (document.getElementById("ABframeoverlay" + iframeRandom)) {
        var a = getWindowWidth(window);
        document.getElementById("ABframeoverlay" + iframeRandom).style.width = a + "px";
        document.getElementById("ABiframe" + iframeRandom).style.width = a + "px"
    }
}
function getWindowWidth(aWindow) {
    if (!aWindow) {
        return 0;
    }
    var calculatedWidth = aWindow.innerWidth;
    var aDoc = aWindow.document;
    if (!aDoc) {
        return 0;
    }
    aWindow = null;
    if ("undefined" != typeof aDoc.body) {
        aWindow = aDoc.body
    } else if (aDoc.getElementById("main")) {
        aWindow = aDoc.getElementById("main");
    }
    var tempDiv = aDoc.getElementById("_invis");
    if (null == tempDiv) {
        tempDiv = aDoc.createElement("div");
        tempDiv.id = "_invis";
        tempDiv.style.left = "0px";
        tempDiv.style.right = "0px";
        tempDiv.style.top = "0px";
        tempDiv.style.height = "0px";
        tempDiv.style.visibility = "hidden";
        aWindow.appendChild(tempDiv);
    }
    var theStyle = getComputedStyleForElement("undefined" != typeof window && window ? window : aDoc.defaultView, aWindow);
    if (!theStyle) {
        return 0;
    }
    var marginLeft = parseInt(theStyle.marginLeft);
    var marginRight = parseInt(theStyle.marginRight);
    0 < tempDiv.offsetWidth && (calculatedWidth = 0 < marginLeft || 0 < marginRight ? tempDiv.offsetWidth + marginRight + marginLeft : tempDiv.offsetWidth);
    aWindow.removeChild(tempDiv);
    return calculatedWidth;
}

function getComputedStyleForElement(parentEl, el) {
    if (!el) {
        return null;
    }
    if ("undefined" != typeof parentEl.getComputedStyle) {
        return parentEl.getComputedStyle(el);
    } else {
        el.currentStyle;
    }
}
(function() {
    if (window.top === window) {
        chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
            if (request.command === 'showoverlay' &&
                request.overlayURL &&
                request.tabURL === document.location.href &&
                iframeURLsrc === undefined) {
                iframeURLsrc = request.overlayURL;
                showoverlay();
            }
        });
    }
})();