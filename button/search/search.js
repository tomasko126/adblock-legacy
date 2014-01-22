/* Paints the UI. */
window.onload = function() {
  const BG = chrome.extension.getBackgroundPage();
  const DESERIALIZE = BG.deserialize;
  const SEARCH_ENGINE_LABEL = 'search_engines';
  const CHK_MODE_SETTINGS_LABEL = 'chk_mode_settings';
  const TXT_SEARCH = $('#txt_search');
  const TXT_DEFAULT_MESSAGE = 'Search privately';

  initialize();



  function initialize() {
    // set functions/events
    define_events();

    //temporary omnibox/everywhere/secure usage analytics
    analytics();

    // default values
    defaults_values();
  };

  function define_events() {
    $('#btn_search').click(btnSearchClick);
    $('.searches_checkbox li').click(checkItemClick);
    $('.search_engines').click(chkSearchEngineClick);
    $('.mode_settings').click(chkModeSettingsClick);
    $('.whats_this').bind({
      mouseenter: showHelpImage,
      mouseleave: hideHelpImage
    });
    $('.beta').bind({
      mouseenter: showBubblePopUp,
      mouseleave: hideBubblePopUp
    });
    $("#enable_show_secure_search").change(toggleSearch);
    $("#engines_arrow").click(function(){ $(".searches_checkbox").css("display","block"); })

    TXT_SEARCH.focus(function () { $(this).css('background-position', '0px -27px'); });
    TXT_SEARCH.blur(function () { $(this).css('background-position', '0px 0px'); });
  };


  function analytics() {
    //temporary omnibox/everywhere/secure usage analytics
    $('#omnibox-box').click(function() {
      var is_checked = $(this).is(':checked');
      localStorage.omnibox = is_checked ? "true" : "false";
      if (is_checked) {
        localStorage.omnibox_on = parseInt(localStorage.omnibox_on) + 1;
      } else {
        localStorage.omnibox_off = parseInt(localStorage.omnibox_off) + 1;
      }
    });

    $('#everywhere-box').click(function() {
      var is_checked = $(this).is(':checked');
      localStorage.everywhere = is_checked ? "true" : "false";
      if (is_checked) {
        localStorage.everywhere_on = parseInt(localStorage.everywhere_on) + 1;
      } else {
        localStorage.everywhere_off = parseInt(localStorage.everywhere_off) + 1;
      }
    });

    TXT_SEARCH.focus(function () { $(this).css('background-position', '0px -27px'); });
    TXT_SEARCH.blur(function () { $(this).css('background-position', '0px 0px'); });
  };

  function defaults_values() {
    var o_se = $(':input[class="'+SEARCH_ENGINE_LABEL+'"][value="'+ DESERIALIZE(localStorage[SEARCH_ENGINE_LABEL]) +'"]');
    if (o_se != undefined) {
      o_se.attr('checked', true).parent().addClass("active");
      TXT_SEARCH.attr('placeholder', TXT_DEFAULT_MESSAGE);
    }


    var is_show_secure_search = $("#enable_show_secure_search"),
        show_search = JSON.parse(localStorage.show_secure_search);
        ui = $("#search_page");

    if (show_search) {
      ui.removeClass("isHidden");
      is_show_secure_search.prop("checked", true);
    } else {
      ui.addClass("isHidden");
      is_show_secure_search.prop("checked", false);
    }

    updateSearchEngineIcon(localStorage[SEARCH_ENGINE_LABEL]);

    var chkbox = JSON.parse(localStorage[CHK_MODE_SETTINGS_LABEL]);
    $('#omnibox-box').attr('checked', chkbox['ominibox']);
    $('#everywhere-box').attr('checked', chkbox['everywhere']);

    if (chkbox['secure'] == false)
      $('#private_mode').attr('checked', true);
    else
      $('#secure_mode').attr('checked', true);

    TXT_SEARCH.focus();
  };

  function btnSearchClick() {
    const PREFIX_URL = "https://";
    var searchEngineIndex = DESERIALIZE(localStorage[SEARCH_ENGINE_LABEL]);
    var uri = null;

    if (searchEngineIndex == 0) uri = 'www.google.com/search?q=';
    else if (searchEngineIndex == 1) uri = 'us.bing.com/search?q=';
    else if (searchEngineIndex == 2) uri = 'search.yahoo.com/search?p=';
    else if (searchEngineIndex == 3) uri = 'blekko.com/ws?q=';
    else if (searchEngineIndex == 4) uri = 'duckduckgo.com/?q=';

    chrome.tabs.create({
      url: PREFIX_URL + uri + encodeURIComponent(TXT_SEARCH.val()) + '&search_plus_one=popup'
    });
  };

  function toolBarInfoClick() {
    chrome.tabs.create({url: 'http://disconnect.me/search/info'});
  };

  function emailSupportClick() {
    var emailTo = "support@disconnect.me",
        title = "Disconnect Search support",
        action_url = "mailto:" + emailTo + "?Subject=" + encodeURIComponent(title);
    chrome.tabs.getSelected(function(tab) {
      chrome.tabs.update(tab.id, { url: action_url });
    });
  };

  function checkItemClick(){
    $(".searches_checkbox").hide();
    if ($(this).hasClass("mode_settings")) {
      $(this).trigger("click");
    } else {
      $(this).find("input").trigger("click");
    }
  };

  function chkSearchEngineClick(e) {
    var checkbox = $(this),
        checkbox_class = "." + checkbox.attr("class");

    $(checkbox_class).attr("checked",false).parent().removeClass("active").find("span").removeClass("flipInYGreen animated");
    // save value in localstorage
    localStorage[SEARCH_ENGINE_LABEL] = DESERIALIZE(checkbox.attr('value'));

    updateSearchEngineIcon(localStorage[SEARCH_ENGINE_LABEL]);

    // force checked (always true);
    if (!checkbox.is(':checked'))
      checkbox.prop('checked', true).parent().addClass("active").find("span").addClass("flipInYGreen animated");

    e.stopPropagation();
  };

  function chkModeSettingsClick() {
    var omnibox = $('#omnibox-box');
    var everywhere = $('#everywhere-box');
    var secure = $('#secure_mode');

    var chk_box = {
      'ominibox': omnibox.is(':checked'),
      'everywhere': everywhere.is(':checked'),
      'secure': secure.is(':checked')
    };

    localStorage[CHK_MODE_SETTINGS_LABEL] = JSON.stringify(chk_box);

    var mode = 0;
    if (everywhere.is(':checked')) mode = 2;
    else if (omnibox.is(':checked')) mode = 1;
    localStorage['mode_settings'] = DESERIALIZE(mode);

    if (secure.is(':checked') == true) {
      if (BG.bgPlusOne.hasProxy()) {
        BG.bgPlusOne.setProxy();
      }
    } else {
      chrome.tabs.query({active: true}, function (tabs) {
        if (!BG.bgPlusOne.isProxyTab(tabs[0].id)) {
          BG.bgPlusOne.removeProxy();
        }
      });
    }

    localStorage['secure_search'] = DESERIALIZE(secure.is(':checked'));
  };

  function showHelpImage() {
    var image = $(this).attr('id') == 'mode1_info' ? '#ominibox' : '#everywhere';
    $(image).show().css("opacity",0).stop(true,true).animate({
      opacity: 1,
      marginTop: 12
    });
  };
  function hideHelpImage() {
    var image = $(this).attr('id') == 'mode1_info' ? '#ominibox' : '#everywhere';
    $(image).stop(true,true).animate({
      opacity: 0,
      marginTop: 0
    }, function(){
      $(this).hide();
    });
  };

  function showBubblePopUp(){
    $('#exp-msg').show().css("opacity",0).stop(true,true).animate({
      opacity: 1,
      top: 35
    });
  };
  function hideBubblePopUp() {
    $('#exp-msg').stop(true,true).animate({
      opacity: 0,
      top: 25
    }, function(){
      $(this).hide();
    });
  };

  function updateSearchEngineIcon(x) {
    var icon;
    if (x == 0) icon = "google";
    else if (x == 1) icon = "bing";
    else if (x == 2) icon = "yahoo";
    else if (x == 3) icon = "blekko";
    else if (x == 4) icon = "duckduckgo";
    document.getElementById("search_engine").className = icon;
  };

  function toggleSearch(){
    var is_show_secure_search = $(this).is(':checked'),
        ui = $("#search_page");
    localStorage.show_secure_search = is_show_secure_search ? "true" : "false";
    if (is_show_secure_search) {
      ui.removeClass("isHidden")
      localStorage.secure_search_on = parseInt(localStorage.secure_search_on) + 1;
    } else {
      ui.addClass("isHidden")
      localStorage.secure_search_off = parseInt(localStorage.secure_search_off) + 1;
    }
  }
};