var notificationMin = 27;
var notificationMax = 200;
function showoverlay(a, b) {
    var mainBody = document.body;
    if (mainBody) {
        var d = "", e = h = t = l = 0, f = !1;
        d = g_iframerand = Math.floor(1E8 * Math.random());
        e = getWindowWidth(window);
        h = notificationMin;
        l = 0;
        t = document.body.scrollTop;
        var g = document.createElement("div");
        g.id = "ABtopspacer" + g_iframerand;
        g.style.height = notificationMin + "px";
        c.insertBefore(g, c.firstChild);
        window.addEventListener("resize", overlayresize, !1);
        g = document.createElement("style");
        g.type = "text/css";
        g.styleSheet ? g.styleSheet.cssText = "@media print{.ABframeoverlay{display:none}}" : g.appendChild(document.createTextNode("@media print{.ABframeoverlay{display:none}}"));
        document.getElementsByTagName("head")[0].appendChild(g);
        g = document.createElement("div");
        g.id = "ABframeoverlay" + d;
        g.style.top = "0px";
        g.style.left = "0px";
        g.style.height = "1px";
        g.style.width = "100%";
        g.style.position = "fixed";
        g.style.backgroundColor = "black";
        g.style.zIndex = "1000000099";
        g.style.visibility = "visible";
        g.className = "ABframeoverlay";
        if (m = window.getComputedStyle(c, null)) {
            var k = parseInt(m.width) + parseInt(m.marginLeft) + parseInt(m.marginRight), j = lp_gettld_url(punycode.URLToASCII(document.location.href));
            "ing.nl" == j && (!f && k > e) && (e = k);
            if ("relative" == m.position) {
                var f = document.body.getBoundingClientRect(), q = 0;
                "ing.nl" != j && k < e && f.left > parseInt(m["margin-left"]) + parseInt(m["padding-left"]) + parseInt(m["border-left-width"]) ? q = (e - k) / 2 : 0 < parseInt(m["margin-left"]) && (q = parseInt(m["margin-left"]));
                g.style.marginLeft = -1 * q + "px"
            }
        }
        c.appendChild(g);
        c = document.createElement("iframe");
        c.id = "ABiframe" + d;
        //TODO
        c.src = urlprefix + "overlay.html?" + b;
        c.style.height = h + "px";
        c.style.width = e + "px";
        c.style.border = "0px";
        c.scrolling = "no";
        g.appendChild(c);
    }
}
function slidedownoverlay(a) {
    var b = document.getElementById("ABiframe" + g_iframerand);
    if (b) {
        var c = parseInt(b.style.height);
        c < g_notificationmax && (b.style.height = c + (10 < g_notificationmax - c ? 10 : g_notificationmax - c) + "px", setTimeout(function() {
            slidedownoverlay(a)
        }, 5))
    }
}
function slideupoverlay(a) {
    var b = document.getElementById("ABiframe" + g_iframerand);
    if (b) {
        var c = parseInt(b.style.height);
        c > notificationMin && (b.style.height = c - (10 < c - notificationMin ? 10 : c - notificationMin) + "px", setTimeout(function() {
            slideupoverlay(a)
        }, 5))
    }
}
function hideoverlay() {
    document.getElementById("ABframeoverlay" + g_iframerand) && (document.body.removeChild(document.getElementById("ABframeoverlay" + g_iframerand)), document.body.removeChild(document.getElementById("lptopspacer" + g_iframerand)), window.removeEventListener("resize", overlayresize, !1))
}
function overlayresize() {
    if (document.getElementById("ABframeoverlay" + g_iframerand)) {
        var a = getWindowWidth(window);
        document.getElementById("ABframeoverlay" + g_iframerand).style.width = a + "px";
        document.getElementById("ABiframe" + g_iframerand).style.width = a + "px"
    }
}
function getWindowWidth(a) {
    if (!a)
        return 0;
    var b = a.innerWidth, c = a.document;
    if (!c)
        return 0;
    a = null;
    "undefined" != typeof c.body ? a = c.body : c.getElementById("main") && (a = c.getElementById("main"));
    var d = c.getElementById("_lpinvis");
    null == d && (d = c.createElement("div"), d.id.left = "_lpinvis", d.style.left = "0px", d.style.right = "0px", d.style.top = "0px", d.style.height = "0px", d.style.visibility = "hidden", a.appendChild(d));
    var e = getComputedStyle("undefined" != typeof window && window ? window : c.defaultView, a);
    if (!e)
        return 0;
    c = parseInt(e.marginLeft);
    e = parseInt(e.marginRight);
    0 < d.offsetWidth && (b = 0 < c || 0 < e ? d.offsetWidth + e + c : d.offsetWidth);
    a.removeChild(d);
    return b
}
function getComputedStyle(a, b) {
    if (!b)
        return null;
    if ("undefined" != typeof a.getComputedStyle)
        return a.getComputedStyle(b);
    else
        b.currentStyle;
}
(function() {
    //get URL
    //create DIV & frame
    
})();