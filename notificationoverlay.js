var notificationMin = 27;
var notificationMax = 200;
var iframeURLsrc;
var iframeRandom;
function showoverlay() {
    var mainBody = document.body;
    if (mainBody) {
        var d = "";
        var f = !1;
        iframeRandom = Math.floor(1E8 * Math.random());
        var winWidth = getWindowWidth(window);
        var t = document.body.scrollTop;
        var spacerElement = document.createElement("div");
        spacerElement.id = "ABtopspacer" + iframeRandom;
        spacerElement.style.height = notificationMin + "px";
        mainBody.insertBefore(spacerElement, mainBody.firstChild);
        window.addEventListener("resize", overlayresize, !1);
        var tempElement = document.createElement("style");
        tempElement.type = "text/css";
        tempElement.styleSheet ? tempElement.styleSheet.cssText = "@media print{.ABframeoverlay{display:none}}" : tempElement.appendChild(document.createTextNode("@media print{.ABframeoverlay{display:none}}"));
        document.getElementsByTagName("head")[0].appendChild(tempElement);
        tempElement = document.createElement("div");
        tempElement.id = "ABframeoverlay" + iframeRandom;
        tempElement.style.top = "0px";
        tempElement.style.left = "0px";
        tempElement.style.height = notificationMin + "px";
        tempElement.style.width = "100%";
        tempElement.style.position = "fixed";
        //tempElement.style.backgroundColor = "black";
        tempElement.style.zIndex = "1000000099";
        tempElement.style.visibility = "visible";
        tempElement.className = "ABframeoverlay";
//        if (m = window.getComputedStyleForElement(mainBody, null)) {
//            var k = parseInt(m.width) + parseInt(m.marginLeft) + parseInt(m.marginRight);
//            if ("relative" == m.position) {
//                tempElement.style.marginLeft = -1 * q + "px"
//            }
//        }
        spacerElement.appendChild(tempElement);
        var abFrame = document.createElement("iframe");
        abFrame.id = "ABiframe" + iframeRandom;
        //TODO - fix for prod
        //abFrame.src ='https://getadblock.com/' + iframeURLsrc;
        abFrame.src = 'http://localhost:8000/survey/' + iframeURLsrc;
        abFrame.style.height = notificationMin + "px";
        abFrame.style.width = winWidth + "px";
        abFrame.style.border = "0px";
        abFrame.scrolling = "no";
        tempElement.appendChild(abFrame);
    }
}
function slidedownoverlay(a) {
    var abFrame = document.getElementById("ABiframe" + iframeRandom);
    if (abFrame) {
        var frameHeight = parseInt(abFrame.style.height);
        frameHeight < notificationMax && (abFrame.style.height = frameHeight + (10 < notificationMax - frameHeight ? 10 : notificationMax - frameHeight) + "px", setTimeout(function() {
            slidedownoverlay(a)
        }, 5))
    }
}
function slideupoverlay(a) {
    var abFrame = document.getElementById("ABiframe" + iframeRandom);
    if (abFrame) {
        var frameHeight = parseInt(abFrame.style.height);
        frameHeight > notificationMin && (abFrame.style.height = frameHeight - (10 < c - notificationMin ? 10 : frameHeight - notificationMin) + "px", setTimeout(function() {
            slideupoverlay(a)
        }, 5))
    }
}
function hideoverlay() {
    document.getElementById("ABframeoverlay" + iframeRandom) && (document.body.removeChild(document.getElementById("ABframeoverlay" + iframeRandom)), document.body.removeChild(document.getElementById("ABtopspacer" + iframeRandom)), window.removeEventListener("resize", overlayresize, !1))
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
    //get URL to open
     BGcall('getNotificationURL', function(url) {
        if (!url) {
            return;
        }
        iframeURLsrc = url;
        showoverlay();
     });
})();