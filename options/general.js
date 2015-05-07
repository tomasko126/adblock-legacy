// Check or uncheck each loaded DOM option checkbox according to the
// user's saved settings.
$(function() {
  for (var name in optionalSettings) {
    $("#enable_" + name).
      prop("checked", optionalSettings[name]);
      //if the user is subscribed to malware, add the checkbox for notifications
      if (name === "experimental_hiding" && optionalSettings[name]) {
        addExperimentalHidingIncognitoDiv(optionalSettings[name]);
      }      
  }
  $("input.feature[type='checkbox']").change(function() {
    var is_enabled = $(this).is(':checked');
    var name = this.id.substring(7); // TODO: hack
    //if the checkbox that was clicked is the malware checkbox, then
    //add a checkbox to for the user to indicate if they wish to be notified of blocked malware
    if (name === "experimental_hiding" && is_enabled) {
        addExperimentalHidingIncognitoDiv();
    } else if (name === "experimental_hiding" && !is_enabled) {
        $("#experimental-hiding-incognito-div").remove();
        BGcall("set_setting", "experimental_hiding_incognito", is_enabled, true);
    }    
    BGcall("set_setting", name, is_enabled, true);
  });

  BGcall("get_settings", function(settings) {
      if (settings.show_advanced_options &&
          !SAFARI &&
          chrome &&
          chrome.runtime &&
          chrome.runtime.onMessage) {
        $("#dropbox").show();
      } else {
        $("#dropbox").hide();
      }
  });

  update_db_icon();
  getDropboxMessage();
});

// TODO: This is a dumb race condition, and still has a bug where
// if the user reloads/closes the options page within a second
// of clicking this, the filters aren't rebuilt. Call this inside
// the feature change handler if it's this checkbox being clicked.
$("#enable_show_google_search_text_ads").change(function() {
  // Give the setting a sec to get saved by the other
  // change handler before recalculating filters.
  window.setTimeout(function() {
    BGcall("update_filters");
  }, 1000);
});

$("#enable_show_advanced_options").change(function() {
  // Reload the page to show or hide the advanced options on the
  // options page -- after a moment so we have time to save the option.
  // Also, disable all advanced options, so that non-advanced users will
  // not end up with debug/beta/test options enabled.
  if (!this.checked)
    $(".advanced input[type='checkbox']:checked").each(function() {
      BGcall("set_setting", this.id.substr(7), false);
    });
  window.setTimeout(function() {
    window.location.reload();
  }, 50);
});

// Experimental hiding of ads is not available on Safari 5.0 & 5.1
if (LEGACY_SAFARI_51) {
    $("#enable_experimental_hiding").hide();
}

// Authenticate button for login/logoff with Dropbox
$("#dbauth").click(function() {
    BGcall("dropboxauth", function(status) {
        if (status === true) {
            BGcall("dropboxlogout");
        } else {
            BGcall("dropboxlogin");
        }
    });
});

$("#dbauthinfo").click(function() {
    BGcall("openTab",
           "http://support.getadblock.com/kb/technical-questions/how-do-i-use-the-dropbox-synchronization-feature");
});

// Change Dropbox button, when user has been logged in/out
function update_db_icon() {
    if (!SAFARI &&
       chrome &&
       chrome.runtime &&
       chrome.runtime.onMessage) {
        BGcall("dropboxauth", function(status) {
            if (status === true) {
                $("#dbauth").addClass("authenticated");
                $("#dbauth").removeClass("not-authenticated");
            } else {
                $("#dbauth").addClass("not-authenticated");
                $("#dbauth").removeClass("authenticated");
            }
        });
    }
}

function getDropboxMessage() {
  BGcall('sessionstorage_get', 'dropboxerror', function(messagecode) {
    //if the message exists, it should already be translated.
    if (messagecode) {
      $("#dbmessage").text(translate(messagecode));
    }
  });
}
// Listen for Dropbox sync changes
if (!SAFARI &&
   chrome &&
   chrome.runtime &&
   chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            if (request.message === "update_checkbox") {
                BGcall("get_settings", function(settings) {
                    $("input[id='enable_show_google_search_text_ads']").prop("checked", settings.show_google_search_text_ads);
                    $("input[id='enable_youtube_channel_whitelist']").prop("checked", settings.youtube_channel_whitelist);
                    $("input[id='enable_show_context_menu_items']").prop("checked", settings.show_context_menu_items);
                    $("input[id='enable_show_advanced_options']").prop("checked", settings.show_advanced_options);
                    $("input[id='enable_whitelist_hulu_ads']").prop("checked", settings.whitelist_hulu_ads);
                    $("input[id='enable_debug_logging']").prop("checked", settings.debug_logging);
                });
                sendResponse({});
            }
            if (request.message === "update_icon") {
                update_db_icon();
                sendResponse({});
            }
            if (request.message === "update_page") {
                document.location.reload();
                sendResponse({});
            }
            if (request.message === "dropboxerror" && request.messagecode) {
              $("#dbmessage").text(translate(request.messagecode));
              sendResponse({});
            }
            if (request.message === "cleardropboxerror") {
              $("#dbmessage").text("");
              sendResponse({});
            }
        }
    );
}

//add a checkbox to for the user to indicate if they wish to be notified of blocked malware
function addExperimentalHidingIncognitoDiv(checked) {
    if (document.getElementById("experimental-hiding-incognito-div"))
        return;//already exists, don't add it again.
    if (!SAFARI) {
        var newDiv = $("<div>").
          attr("id", "experimental-hiding-incognito-div");
        var newInput = $('<input />').
          attr("type", "checkbox").
          attr("class", "feature").
          attr("id", "enable_experimental_hiding_incognito").
          css("margin-left", "25px").
          prop("checked", checked ? true : null);
        var newLabel = $("<label>").
          text(translate("experimentalhidingincognitocheckboxmessage")).
          attr("for", "enable_experimental_hiding_incognito");
        newDiv.append(newInput).append(newLabel);
    
        $("#enable_experimental_hiding_div").after(newDiv);
        $("#enable_experimental_hiding_incognito").click(function() {
            var is_enabled = $(this).is(':checked');
            BGcall("set_setting", "experimental_hiding_incognito", is_enabled, true);
        });        
        
    }
}