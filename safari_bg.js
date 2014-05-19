emit_page_broadcast = function(request) {
  safari.application.activeBrowserWindow.activeTab.page.dispatchMessage('page-broadcast', request);
};

// Imitate frameData object for Safari to avoid issues when using blockCounts.
frameData = (function() {
  // Map that will serve as cache for the block count.
  // key: Numeric - tab id.
  // value: Numeric - actual block count for the tab.
  var countMap = { };

  return {
    getCountMap: function() {
      return countMap;
    },

    // Get frameData for the tab.
    // Input:
    //  tabId:Numberic - id of the tab you want to get
    get: function(tabId) {
      return countMap[tabId] || {};
    },
    
    // Create a new frameData
    // Input:
    //  tabId:Numeric - id of the tab you want to add in the frameData
    create: function(tabId, url, domain) {
        var activeTab = safari.application.activeBrowserWindow.activeTab;
        if(!tabId) tabId = safari.application.activeBrowserWindow.activeTab.id;

        url = activeTab.url;
        domain = parseUri(url).hostname;
        var tracker = countMap[tabId];

        var shouldTrack = !tracker || tracker.url !== url;
        if (shouldTrack) {
          countMap[tabId] = { 
            blockCount: 0,
            domain: domain,
            url: url,
          };
        }
        return tracker;
    },
  }
})();

// True blocking support.
safari.application.addEventListener("message", function(messageEvent) {
  if (messageEvent.name === "request") {
    var args = messageEvent.message.data.args;
    if (messageEvent.target.url === args[1].tab.url)
      frameData.create(messageEvent.target.id, args[1].tab.url, args[0].domain);
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

// Listen to tab activation, this is triggered when a tab is activated or on focus.
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

safari.application.addEventListener("open", function(event) {
  updateBadge();
}, true);

safari.application.addEventListener("beforeNavigate", function(event) {
  var tabId = safari.application.activeBrowserWindow.activeTab.id;
  frameData.get(tabId).blockCount = 0;
  updateBadge();
}, true);

// Update the badge for each tool bars in a window.(Note: there is no faster way of updating
// the tool bar item for the active window so I just updated all tool bar items' badge. That
// way, I don't need to loop and compare.)
var updateBadge = function() {
  var show_block_counts = get_settings().display_stats;
  
  var url = safari.application.activeBrowserWindow.activeTab.url;
  var paused = adblock_is_paused();
  var canBlock = !page_is_unblockable(url);
  var whitelisted = page_is_whitelisted(url);
  
  var count = 0;
  if(show_block_counts && !paused && canBlock && !whitelisted) {  
    var tabId = safari.application.activeBrowserWindow.activeTab.id;
    count = tabId ? blockCounts.getTotalAdsBlocked(tabId) : 0;
  }
  var safari_toolbars = safari.extension.toolbarItems;
  for(var i = 0; i < safari_toolbars.length; i++ ) {
    safari_toolbars[i].badge = count;
  }
  frameData.get(tabId).blockCount = count;
}

safari.application.addEventListener("command", function(event) {
  // It is possible to do perform a command without activating a window
  // (at least on Mac). That means we can't blindly perform actions in activeWindow,
  // otherwise users would be very confused. So let's figure out which window sent the command.

  var browserWindow;
  if (event.target.browserWindow) {
    // Context menu item event or button event on Safari 5.0, browserWindow is available in event.target.
    browserWindow = event.target.browserWindow;
  } else if (!LEGACY_SAFARI && event.target instanceof SafariExtensionMenuItem) {
    // Identifier will be of the form menuId:command, let's use this to get our window
    var menuId = event.target.identifier.split(':')[0];
    browserWindow = windowByMenuId[menuId];
  } else {
    // browserWindow is not available in event.target for context menu item events in Safari 5.1.
    browserWindow = safari.application.activeBrowserWindow;
  }
  var command = event.command;
  
  if (command === "toggle-block-display") {
    var show_block_counts = get_settings().display_stats;
    updateDisplayStats(!show_block_counts);
  } else if (command === "AdBlockOptions") {
    openTab("options/index.html", false, browserWindow);
  } else if (command === "toggle-pause") {
    if (adblock_is_paused()) {
      adblock_is_paused(false);
    } else {
      adblock_is_paused(true);
    }
  } else if (command === "whitelist-youtube-channel") {
    var tab = browserWindow.activeTab;
    create_whitelist_filter_for_youtube_channel(tab.url);
    tab.url = tab.url;
  } else if (command === "whitelist-currentpage") {
    var tab = browserWindow.activeTab;
    create_page_whitelist_filter(tab.url);
    tab.url = tab.url;
  } else if (command === "unwhitelist-currentpage") {
    var tab = browserWindow.activeTab;
    var unwhitelisted = false;
    while (try_to_unwhitelist(tab.url)) {
      unwhitelisted = true;
    }
    if (unwhitelisted) {
      tab.url = tab.url;
    }
  } else if (command === "report-ad") {
    var url = "pages/adreport.html?url=" + escape(browserWindow.activeTab.url);
    openTab(url, true, browserWindow);
  } else if (command === "undo-last-block") {
    var tab = browserWindow.activeTab;
    var host = parseUri(tab.url).host;
    var count = count_cache.getCustomFilterCount(host);

    var confirmation_text   = translate("confirm_undo_custom_filters", [count, host]);
    if(!confirm(confirmation_text)) { return; }

    remove_custom_filter_for_host(host);
    if (!page_is_unblockable(tab.url))
      tab.url = tab.url;
  } else if (command in {"show-whitelist-wizard": 1, "show-blacklist-wizard": 1, "show-clickwatcher-ui": 1 }) {
    browserWindow.activeTab.page.dispatchMessage(command);
  }
}, false);

// Starting with 5.1, we can attach menus to toolbar items. If safari.extension.createMenu is available,
// we can make the toolbar button display a proper menu with items from Chrome's popup.
if (!LEGACY_SAFARI) {
  (function() {
    // Unfortunately, Safari API kinda sucks. Command events sent from toolbar menu items don't include a
    // reference to the browser window that sent them, same goes for the Menu events. This unfortunately
    // means that we have to create a separate instance of menu for each browser window.

    // Menu identifiers must be unique, we'll just name them sequentially.
    var nextMenuId = (function() {
      var counter = 0;
      return function() {
        var id = counter++;
        return "ABMainMenu_" + id;
      }
    })();

    function createMenu(toolbarItem) {
      var menu = safari.extension.createMenu(nextMenuId());

      windowByMenuId[menu.identifier] = toolbarItem.browserWindow;

      // Attach the menu to the toolbar item
      toolbarItem.menu = menu;
      toolbarItem.toolTip = "AdBlock"; // change the tooltop on Safari 5.1+
      toolbarItem.command = null; // otherwise Safari will only show the menu on long-press
    }

    function removeMenu(menu) {
      delete windowByMenuId[menu.identifier];
      safari.extension.removeMenu(menu.identifier);
    }

    safari.application.addEventListener("validate", function(event) {
      if (event.target instanceof SafariExtensionToolbarItem) {
        var item = event.target;

        if (item.browserWindow && !item.menu) {
          // Check if only this item lacks a menu (which means user just opened a new window) or there are multiple items
          // lacking a menu (which only happens on browser startup or when the user removes AdBlock toolbar item and later
          // drags it back).
          var uninitializedItems = 0;
          for (var i = 0; i < safari.extension.toolbarItems.length; i++) {
            var item = safari.extension.toolbarItems[i];
            if (!item.menu) {
              uninitializedItems++;
            }
          }

          if (uninitializedItems > 1) {
            // Browser startup or toolbar item added back to the toolbar. To prevent memory leaks in the second case,
            // we need to remove all previously created menus and window mappings (as they are now invalid).
            var menus = safari.extension.menus;
            for (var i = 0; i < menus.length; i++) {
              removeMenu(menus[i]);
            }

            // And now recreate the menus for toolbar items in all windows.
            for (var i = 0; i < safari.extension.toolbarItems.length; i++) {
              createMenu(safari.extension.toolbarItems[i]);
            }
          } else {
            // New window opened, just create a menu for this window's item.
            createMenu(item);
          }
        }
      }
    }, true);

    // Remove the menu when the window closes so we don't leak memory.
    safari.application.addEventListener("close", function(event) {
      if (event.target instanceof SafariBrowserWindow) { // don't handle tabs
        for (var i = 0; i < safari.extension.toolbarItems.length; i++) {
          var item = safari.extension.toolbarItems[i];
          if (item.browserWindow === event.target) {
            var menu = item.menu;

            // Safari docs say that we must detach menu from toolbar items before removing.
            item.menu = null;

            // Remove the menu and window mapping.
            removeMenu(menu);
            break;
          }
        }
      }
    }, true);

    // As there is no API to toggle visibility of toolbar items, we'd have to dynamically append and remove
    // them when something changes. Instead, let's just cheat and recreate the whole menu when the user
    // tries to open it.
    safari.application.addEventListener("menu", function(event) {
      var menu = event.target;

      if (menu.identifier.indexOf("ABMainMenu_") === 0) {
        while (menu.menuItems.length > 0) {
          menu.removeMenuItem(0);
        }

        // Menu item identifiers must be unique and we need some way to figure out the
        // window by menu item, so let's prefix them with menu ID.
        function itemIdentifier(identifier) {
          return menu.identifier + ':' + identifier;
        }
        function appendMenuItem(command, title, checked) {
          var item = menu.appendMenuItem(itemIdentifier(command), title, command);
          if (checked) {
            item.checkedState = SafariExtensionMenuItem.CHECKED;
          }
        }
        
        var url = windowByMenuId[menu.identifier].activeTab.url;
        var paused = adblock_is_paused();
        var canBlock = !page_is_unblockable(url);
        var whitelisted = page_is_whitelisted(url);
        var host = parseUri(url).host;
        var tabId = safari.application.activeBrowserWindow.activeTab.id;
        
        if(canBlock && !paused && !whitelisted) {
          // Block count in menu.
          appendMenuItem("blocked-ads", translate("blocked_ads"));
          var show_block_counts = get_settings().display_stats;
          var total_blocked = blockCounts.getTotalAdsBlocked();
          appendMenuItem("blocked-in-total", "      " + translate("blocked_n_in_total", [total_blocked]));
          var blocked_in_tab = blockCounts.getTotalAdsBlocked(tabId);
          appendMenuItem("blocked-on-page", "      " + translate("blocked_n_on_this_page", [blocked_in_tab]));
          appendMenuItem("toggle-block-display", translate("show_on_adblock_button"), show_block_counts);
          menu.appendSeparator(itemIdentifier("separator0"));
        }
        
        var should_show;
        var eligible_for_undo = !paused && (!canBlock || !whitelisted);
        if (eligible_for_undo && count_cache.getCustomFilterCount(host)) {
          appendMenuItem("undo-last-block", translate("undo_last_block"));
          menu.appendSeparator(itemIdentifier("separator0"));
        }
        if (host === "www.youtube.com" && /channel|user/.test(url) && get_settings().youtube_channel_whitelist && eligible_for_undo) {
          appendMenuItem("whitelist-youtube-channel", translate("whitelist_youtube_channel"));
          menu.appendSeparator(itemIdentifier("separator0"));
        }
        appendMenuItem("toggle-pause", translate("pause_adblock"), paused);
        if (!paused && canBlock) {
          if (whitelisted) {
            // Show one checked "Don't run on this page" item that would un-whitelist the page.
            // That doesn't correspond one-to-one with whitelisting items (there are two of them,
            // one that whitelists specific page and one that whitelists the domain), but this doesn't
            // require changing anything in translations and works nice anyway.
            appendMenuItem("unwhitelist-currentpage", translate("dont_run_on_this_page"), true);
          } else {
            appendMenuItem("show-clickwatcher-ui", translate("block_an_ad_on_this_page"));
            appendMenuItem("whitelist-currentpage", translate("dont_run_on_this_page"));
            appendMenuItem("show-whitelist-wizard", translate("dont_run_on_pages_on_domain"));
          }
        }
        menu.appendSeparator(itemIdentifier("separator"));
        if (!paused && canBlock && !whitelisted && get_settings().show_advanced_options) {
          appendMenuItem("report-ad", translate("report_ad_on_page"));
        }
        appendMenuItem("AdBlockOptions", translate("options"));
      }
    })
  })();
}

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
