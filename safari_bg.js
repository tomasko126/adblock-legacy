emit_page_broadcast = function(request) {
    safari.application.activeBrowserWindow.activeTab.page.dispatchMessage('page-broadcast', request);
};

//frameData object for Safari
frameData = (function() {
    // Map that will serve as cache for the block count.
    // key: Numeric - tab id.
    // value: Numeric - actual block count for the tab.
    var countMap = {};

    return {
        getCountMap: function() {
            return countMap;
        },
        // Get frameData for the tab.
        // Input:
        //   tabId: Integer - id of the tab you want to get
        get: function(tabId) {
            return frameData[tabId] || {};
        },

        // Create a new frameData
        // Input:
        //   tabId: Integerc - id of the tab you want to add in the frameData
        create: function(tabId, url, domain) {
            return frameData._initializeMap(tabId, url, domain);
        },
        // Reset a frameData
        // Inputs:
        //   tabId: Integer - id of the tab you want to add in the frameData
        //   url: new URL for the tab
        reset: function(tabId, url) {
            var domain = parseUri(url).hostname;
            return frameData._initializeMap(tabId, url, domain);
        },
        // Initialize map
        // Inputs:
        //   tabId: Integer - id of the tab you want to add in the frameData
        //   url: new URL for the tab
        //   domain: domain of the request
        _initializeMap: function(tabId, url, domain) {
            var tracker = frameData[tabId];

            var shouldTrack = !tracker || tracker.url !== url;
            if (shouldTrack) {
                frameData[tabId] = {
                    resources: {},
                    domain: domain,
                    url: url,
                };
            }
            return tracker;
        },
        // Store resource
        // Inputs:
        //   tabId: Numeric - id of the tab you want to delete in the frameData
        //   url: url of the resource
        storeResource: function(tabId, url) {
            if (!get_settings().show_advanced_options)
                return;
            var data = this.get(tabId);
            if (data !== undefined)
                data.resources[url] = null;
        },
        // Delete tabId from frameData
        // Input:
        //   tabId: Numeric - id of the tab you want to delete in the frameData
        close: function(tabId) {
            delete frameData[tabId];
        }
    }
})();

// True blocking support.
safari.application.addEventListener("message", function(messageEvent) {

  if (messageEvent.name === "request" &&
      messageEvent.message.data.args.length >= 2 &&
      messageEvent.message.data.args[0] &&
      messageEvent.message.data.args[1] &&
      messageEvent.message.data.args[1].tab &&
      messageEvent.message.data.args[1].tab.url) {
        var args = messageEvent.message.data.args;
        if (!messageEvent.target.url ||
            messageEvent.target.url === args[1].tab.url &&
            messageEvent.message.frameInfo.top_level === true) {

            frameData.create(messageEvent.target.id, args[1].tab.url, args[0].domain);
        } else if (messageEvent.target.url === frameData.get(messageEvent.target.id).url &&
                   messageEvent.message.frameInfo.top_level === true) {
            frameData.reset(messageEvent.target.id, args[1].tab.url);
        }
        return;
    }

    if (messageEvent.name !== "canLoad")
        return;

    var tab = messageEvent.target;
    var frameInfo = messageEvent.message.frameInfo;
    chrome._tabInfo.notice(tab, frameInfo);
    var sendingTab = chrome._tabInfo.info(tab, frameInfo.visible);

    if (adblock_is_paused() || page_is_unblockable(sendingTab.url) ||
        page_is_whitelisted(sendingTab.url)) {
        messageEvent.message = true;
        return;
    }

    var url = messageEvent.message.url;
    var elType = messageEvent.message.elType;
    var frameDomain = messageEvent.message.frameDomain;

    var isMatched = url && (_myfilters.blocking.matches(url, elType, frameDomain));
    if (isMatched) {
        // If matched, add one block count to the corresponding tab that owns the request,
        // update the badge afterwards
        var tabId = messageEvent.target.id;
        blockCounts.recordOneAdBlocked(tabId);
        updateBadge();
        log("SAFARI TRUE BLOCK " + url + ": " + isMatched);
    }
    messageEvent.message = !isMatched;
}, false);

// Allows us to figure out the window for commands sent from the menu. Not used in Safari 5.0.
var windowByMenuId = {};

// Show number of blocked ads in badge for each tab
safari.application.addEventListener("activate", function(event) {
    if (get_settings().display_stats) {
        var tabId = safari.application.activeBrowserWindow.activeTab.id;
        var get_blocked_ads = frameData.get(tabId).blockCount;
        var safari_toolbars = safari.extension.toolbarItems;
        for (var i = 0; i < safari_toolbars.length; i++ ) {
            safari_toolbars[i].badge = get_blocked_ads;
        }
    }
}, true);

// Clear badge on Top Sites
safari.application.addEventListener("navigate", function() {
    
    if (safari.application.activeBrowserWindow.activeTab.url === undefined) {
        var tabId = safari.application.activeBrowserWindow.activeTab.id;
        frameData.reset(tabId);
        updateBadge();
    }
   
});

safari.application.addEventListener("beforeNavigate", function(event) {
    var tab = safari.application.activeBrowserWindow.activeTab;
    if (tab.url === event.url) {
       
        frameData.get(tab.id).blockCount = 0;
        updateBadge();
    }
}, true);

// On close event fires when tab is about to close,
// not when tab was closed. Therefore we need to remove
// countMap[tabId] after "close" event has been fired.
safari.application.addEventListener("close", function(event) {

    setTimeout(function() {
        var opened_tabs = [];
        var safari_tabs = safari.application.activeBrowserWindow.tabs;
        for (var i=0; i < safari_tabs.length; i++)
            opened_tabs.push(safari_tabs[i].id);

        for (tab in frameData.getCountMap())
            if (opened_tabs.indexOf(parseInt(tab)) === -1)
                frameData.close(parseInt(tab));
    }, 150);
}, true);

// Update the badge for each tool bars in a window.(Note: there is no faster way of updating
// the tool bar item for the active window so I just updated all tool bar items' badge. That
// way, I don't need to loop and compare.)
var updateBadge = function() {
    var show_block_counts = get_settings().display_stats;

    if (!show_block_counts)
        return;

    var url = safari.application.activeBrowserWindow.activeTab.url;
    var paused = adblock_is_paused();
    var canBlock = !page_is_unblockable(url);
    var whitelisted = page_is_whitelisted(url);

    var count = 0;
    if (show_block_counts && !paused && canBlock && !whitelisted) {
        var tabId = safari.application.activeBrowserWindow.activeTab.id;
        count = tabId ? blockCounts.getTotalAdsBlocked(tabId) : 0;
    }
    var safari_toolbars = safari.extension.toolbarItems;
    for (var i = 0; i < safari_toolbars.length; i++ ) {
        safari_toolbars[i].badge = count;
    }
    frameData.get(tabId).blockCount = count;
}

// Code for removing popover
function removePopover(popover) {
    safari.extension.removePopover(popover);
}

// Reload popover when opening/activating tab, or URL was changed
safari.application.addEventListener("activate", function(event) {
    if (event.target instanceof SafariBrowserTab) {
        safari.extension.popovers[0].contentWindow.location.reload();
        // Hide popover, when new tab has been opened
        if (ABPopover.visible)
            ABPopover.hide();
    }
}, true);

safari.application.addEventListener("popover", function(event) {
    safari.extension.popovers[0].contentWindow.location.reload();
}, true);

safari.application.addEventListener("validate", function(event) {
    if (event.target instanceof SafariExtensionToolbarItem) {
        var item = event.target;
            if (item.browserWindow && !item.popover) {
                // Check if only this item lacks a popover (which means user just opened a new window) or there are multiple items
                // lacking a popover (which only happens on browser startup or when the user removes AdBlock toolbar item and later
                // drags it back).
                var uninitializedItems = 0;
                for (var i = 0; i < safari.extension.toolbarItems.length; i++) {
                    var item = safari.extension.toolbarItems[i];
                    if (!item.popover) {
                        uninitializedItems++;
                    }
                }
                if (uninitializedItems > 1) {
                    // Browser startup or toolbar item added back to the toolbar. To prevent memory leaks in the second case,
                    // we need to remove all previously created popovers.
                    for (var i = 0; i < safari.extension.toolbarItems.length; i++) {
                        removePopover(ABPopover);
                    }
                    // And now recreate the popover for toolbar items in all windows.
                    setPopover(ABPopover);
                } else {
                    // New window has been opened, create popover for it
                    setPopover(ABPopover);
                }
            }
    }
}, true);

// Remove the popover when the window closes so we don't leak memory.
safari.application.addEventListener("close", function(event) {
    if (event.target instanceof SafariBrowserWindow) { // don't handle tabs
        for (var i = 0; i < safari.extension.toolbarItems.length; i++) {
            var item = safari.extension.toolbarItems[i];
            if (item.browserWindow === event.target) {
                var popover = item.popover;

                // Safari docs say that we must detach popover from toolbar items before removing.
                item.popover = null;

                // Remove the popover.
                removePopover(ABPopover);
                break;
            }
        }
    }
}, true);

// Set commands for whitelist, blacklist and undo my blocks wizards
safari.application.addEventListener("command", function(event) {
    var browserWindow;
    if (event.target.browserWindow) {
        // Context menu item event or button event on Safari 5.0, browserWindow is available in event.target.
        browserWindow = event.target.browserWindow;
    } else {
        // browserWindow is not available in event.target for context menu item events in Safari 5.1.
        browserWindow = safari.application.activeBrowserWindow;
    }
    var command = event.command;

    if (command in {"show-whitelist-wizard": 1, "show-blacklist-wizard": 1, "show-clickwatcher-ui": 1 }) {
        browserWindow.activeTab.page.dispatchMessage(command);
    }
}, false);

var dispatchMessage = function(command) {
    safari.application.activeBrowserWindow.activeTab.page.dispatchMessage(command);
};

// Open Options page upon settings checkbox click.
safari.extension.settings.openAdBlockOptions = false;
safari.extension.settings.addEventListener("change", function(e) {
    if (e.key == 'openAdBlockOptions')
        openTab("options/index.html");
}, false);

// Add context menus
safari.application.addEventListener("contextmenu", function(event) {
    if (!event.userInfo)
        return;
    if (!get_settings().show_context_menu_items || adblock_is_paused())
        return;

    var url = event.target.url;
    if (page_is_unblockable(url) || page_is_whitelisted(url))
        return;

    event.contextMenu.appendContextMenuItem("show-blacklist-wizard", translate("block_this_ad"));
    event.contextMenu.appendContextMenuItem("show-clickwatcher-ui", translate("block_an_ad_on_this_page"));

    var host = parseUri(url).host;
    if (count_cache.getCustomFilterCount(host))
        event.contextMenu.appendContextMenuItem("undo-last-block", translate("undo_last_block"));
}, false);
