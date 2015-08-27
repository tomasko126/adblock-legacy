"use strict";

// Get tabId from URL
var tabId = parseUri.parseSearch(document.location.href).tabId;
tabId = parseInt(tabId);

// Get frameData object
BGcall("resourceblock_get_frameData", tabId, function(data) {
    if (!data) {
        alert(translate('noresourcessend2'));
        window.close();
        return;
    }

    BGcall("storage_get", "filter_lists", function(filterLists) {
        // TODO: Excluded filters & excluded hiding filters?
        for (var id in filterLists) {
            if (!filterLists[id].subscribed) {
                delete filterLists[id];
            }
        }

        var opts = {
            domain: parseUri(document.location.href).hostname
        };

        BGcall("get_content_script_data", opts, function(arg) {

            filterLists["AdBlock"] = {};
            filterLists.AdBlock.text = MyFilters.prototype.getExtensionFilters(arg.settings);

            BGcall("storage_get", "custom_filters", function(filters) {

                if (filters) {
                    filters = filters.split('\n');

                    filterLists["Custom"] = {};
                    filterLists["Custom"].text = [];

                    // Filter out comments and ignored filters
                    for (var i=0; i<filters.length; i++) {
                        try {
                            var normalized = FilterNormalizer.normalizeLine(filters[i]);
                            if (normalized) {
                                filterLists["Custom"].text.push(normalized);
                            }
                        } catch(ex) {
                            // Broken filter
                        }
                    }
                }

                for (var frameId in data) {
                    var frame = data[frameId];
                    var frameResources = frame.resources;
                    var frameDomain = frame.domain;

                    for (var resource in frameResources) {
                        var res = frameResources[resource];
                        // Don't process hiding filters
                        if (res.reqType === "HIDE") {
                            continue;
                        }
                        var urlDomain = parseUri(resource).hostname;
                        var thirdParty = BlockingFilterSet.checkThirdParty(urlDomain, frameDomain);
                        res.thirdParty = thirdParty;
                        if (res.blockedData !== false) {
                            var filter = res.blockedData.text;
                            for (var filterList in filterLists) {
                                if (filterList === "malware") {
                                    if (filterLists[filterList].text.adware.indexOf(filter) > -1) {
                                        res.blockedData["filterList"] = filterList;
                                    }
                                } else {
                                    if (filterLists[filterList].text.indexOf(filter) > -1) {
                                        res.blockedData["filterList"] = filterList;
                                    }
                                }
                            }
                        }
                    }
                }
                createTable(data);
            });
        });
    });
});

function createUI(domain, frameId) {
    var elem = null;
    if (frameId === "0") {
        elem = "#header";
    } else {
        var el = document.querySelectorAll(".resourceslist").length;
        elem = document.querySelectorAll(".resourceslist")[el-1];
    }
    $(elem).after(
        '<table data-href=' + domain + ' class="resourceslist">' +
            '<thead>' +
                '<tr>' +
                    '<th class="frameurl">' + 'Frame: ' + domain + '<\/th>' +
                '<\/tr>' +
                '<tr>' +
                    '<th i18n="headerresource" data-column="url"><\/th>' +
                    '<th i18n="headertype" data-column="type"><\/th>' +
                    '<th i18n="headerfilter" data-column="filter" style="text-align: center;"><\/th>' +
                    '<th i18n="thirdparty" data-column="thirdparty" style="text-align: center;"><\/th>' +
                '<\/tr>' +
            '<\/thead>' +
            '<tbody>' +
            '<\/tbody>' +
        '<\/table>'
    );
}

// Now create that table row-by-row
function createTable(frames) {
    var data = {};
    for (var frame in frames) {
        var frameObject = frames[frame];
        if (typeof frameObject === "number")
            continue;
        // TODO: Create UI for sub_frames without resources
        var length = Object.keys(frameObject.resources).length;
        if (length === 0)
            continue;
        console.log(frame);
        // Create table for frame
        createUI(frameObject.domain, frame);
        for (var resource in frameObject["resources"]) {
            var res = frameObject["resources"][resource];
            // TODO: Use better approach?
            res.url = resource;
            
            // Don't show main_frame resource, unless it's excluded by $document or $elemhide
            if (res.reqType === "main_frame" && (!res.blockedData || !res.blockedData.blocked))
                continue;

            var row = $("<tr>");
            
            if (res.reqType === "HIDE") {
                row.addClass("hiding");
            } else if (res.blockedData) {
                if (res.blockedData.blocked) {
                    row.addClass("blocked");
                } else {
                    row.addClass("whitelisted");
                }
            }

            // TODO: Truncating according to other URL elements & length?
            function truncateURI(uri) {
                if (uri.length > 90) {
                    return uri.substring(0, 80) + '[...]';
                }
                return uri;
            }

            // Cell 2: URL
            $("<td>").
            attr("title", res.url).
            attr("data-column", "url").
            text(truncateURI(res.url)).
            appendTo(row);

            // Cell 3: Type
            $("<td>").
            attr("data-column", "type").
            css("text-align", "center").
            text(res.reqType === "HIDE" ? "selector" : res.reqType).
            // TODO: i18n?
            //text(translate('type' + typeName)).
            appendTo(row);

            // Cell 4: Matching filter
            cell = $("<td>").
            attr("data-column", "filter").
            css("text-align", "center");
            if (res.blockedData) {
                $("<span>").
                text(truncateURI(res.blockedData.text)).
                attr('title', translate("filterorigin", res.blockedData.filterList)).
                appendTo(cell);
            }
            row.append(cell);

            // Cell 5: third-party or not
            var cell = $("<td>").
            text(res.thirdParty ? translate("yes") : translate("no")).
            // TODO: Resource domain..
            //attr("title", translate("resourcedomain", resources[i].domain || resourceDomain)).
            attr("data-column", "thirdparty").
            css("text-align", "center");
            row.append(cell);

            if (!data[frames[frame].domain]) {
                data[frames[frame].domain] = [];
            }
            data[frames[frame].domain].push(row);
        }
    }

    for (var domain in data) {
        for (var i=0; i<data[domain].length; i++) {
            var resource = data[domain][i];
            $('[data-href="' + domain + '"] tbody').append(resource);
        }
    }
    localizePage();
    
    $(".frameurl").click(function(event) {
        var id = event.currentTarget.offsetParent.dataset.href;
        var el = $('[data-href="' + id + '"] tbody');
        var isHidden = el.is(":hidden");
        if (!isHidden) {
            el.hide();
            $('[data-href="' + id + '"] thead tr:nth-child(2)').hide();
        } else {
            el.show();
            $('[data-href="' + id + '"] thead tr:nth-child(2)').show();
        }
    });
}

/*

var resources = {};
var custom_filters = {};
var chosenResource = {};
var local_filtersets = {};

// Creates the table that shows all blockable items
function generateTable() {
  // Truncates a resource URL if it is too long. Also escapes some
  // characters when they have a special meaning in HTML.
  // Inputs: the string to truncate
  // Returns the truncated string
  function truncateI(j) {
    if (j.length > 90)
      if (j.indexOf('?') > 43 && j.indexOf('?') <= 85)
        j = j.substring(0, j.indexOf('?') + 1) + '[...]';
    if (j.length > 90)
      j = j.substring(0, 86) + '[...]';

    return j;
  }

  // Now create that table row-by-row
  var rows = [];
  for (var i in resources) {
    var matchingfilter = resources[i].filter;
    var matchingListID = "", matchingListName = "";
    var typeName = getTypeName(resources[i].type);

    if (matchingfilter) {
      // If matchingfilter is already set, it's a hiding rule or a bug.
      // However, we only know the selector part (e.g. ##.ad) not the full
      // selector (e.g., domain.com##.ad). Neither do we know the filter list
      for (var fset in local_filtersets) {
        // Slow? Yeah, for sure! But usually you have very few hiding rule
        // matches, not necessary for the same domain. And we can be slow in
        // resourceblock, so there is no need to cache this.
        var hidingset = local_filtersets[fset].hiding;
        var hidingrules = hidingset.filtersFor(resources[i].domain, true);
        if (hidingrules.indexOf(matchingfilter.substr(2)) !== -1) {
          var subdomain = resources[i].domain;
          var k = 0;
          while (subdomain) {
            k++; if (k>100) break;
            if (hidingset.items[subdomain]) {
              for (var j=0; j<hidingset.items[subdomain].length; j++) {
                if (hidingset.items[subdomain][j].selector === matchingfilter.substr(2)) {
                  // Ignore the case that a list contains both
                  // ##filter
                  // ~this.domain.com,domain.com##filter
                  matchingfilter = hidingset.items[subdomain][j]._text;
                }
              }
            }
            if (subdomain === "global") {break;}
            subdomain = subdomain.replace(/^.+?(\.|$)/, '') || "global";
          }
          matchingListID = fset;
          break;
        }
      }
    } else {
      for (var fset in local_filtersets) {
        var currentlist_matchingfilter = local_filtersets[fset].blocking.
              matches(i, resources[i].type, resources[i].domain, true);
        if (currentlist_matchingfilter) {
          matchingListID = fset;
          matchingfilter = currentlist_matchingfilter;
          if (Filter.isWhitelistFilter(currentlist_matchingfilter))
            break;
        }
      }
    }

    if (matchingListID) {
      if (matchingListID === "user_custom_filters") {
        matchingListName = translate("tabcustomize");
      } else if (matchingListID === "build_in_filters") {
        matchingListName = "AdBlock";
      } else {
        matchingListName = translate("filter" + matchingListID);
        if (!matchingListName) {
          matchingListName = matchingListID.substr(4);
          validateUrl(matchingListName);
        }
      }
    }

    var type = {sort:3, name:undefined};
    if (matchingfilter) {
      if (Filter.isWhitelistFilter(matchingfilter))
        type = {sort:2, name:'whitelisted'};
      else if (Filter.isSelectorFilter(i)) {
        // TODO: report excluded hiding rules
        type = {sort:0, name:'hiding'};
      } else
        type = {sort:1, name:'blocked'};
    } else {
      matchingfilter = "";
    }

    // TODO: When crbug 80230 is fixed, allow $other again
    var disabled = (typeName === 'other' || typeName === 'unknown');

    // We don't show the page URL unless it's excluded by $document or $elemhide
    if (typeName === 'page' && !matchingfilter)
      continue;

    var row = $("<tr>");
    if (type.name)
      row.addClass(type.name);

    // Cell 1: Checkbox
    var cell = $("<td><input type='checkbox'/></td>").css("padding-left", "4px");
    if (disabled)
      cell.find("input").prop("disabled", true);
    row.append(cell);

    // Cell 2: URL
    $("<td>").
      attr("title", i).
      attr("data-column", "url").
      text(truncateI(i)).
      appendTo(row);

    // Cell 3: Type
    $("<td>").
      attr("data-column", "type").
      css("text-align", "center").
      text(translate('type' + typeName)).
      appendTo(row);

    // Cell 4: hidden sorting field and matching filter
    cell = $("<td>").
      attr("data-column", "filter").
      css("text-align", "center");
    $("<span>").
      addClass("sorter").
      text(type.name ? type.sort : 3).
      appendTo(cell);
    if (type.name)
      $("<span>").
        text(truncateI(custom_filters[matchingfilter] || matchingfilter)).
        attr('title', translate("filterorigin", matchingListName)).
        appendTo(cell);
    row.append(cell);
    resources[i].filter = matchingfilter;
    resources[i].filterlist = matchingListName;

    // Cell 5: third-party or not
    var resourceDomain = parseUri(i).hostname;
    var isThirdParty = (type.name === 'hiding' ? false :
        BlockingFilterSet.checkThirdParty(resources[i].domain, resourceDomain));
    cell = $("<td>").
        text(isThirdParty ? translate('yes') : translate('no')).
        attr("title", translate("resourcedomain", resources[i].domain || resourceDomain)).
        attr("data-column", "thirdparty").
        css("text-align", "center");
    row.append(cell);
    resources[i].isThirdParty = isThirdParty;
    resources[i].resourceDomain = resourceDomain;

    // Cells 2-5 may get class=clickableRow
    if (!disabled)
      row.find("td:not(:first-child)").addClass("clickableRow");

    // Cell 6: delete a custom filter
    if (custom_filters[matchingfilter])
      $("<td>").
        addClass("deleterule").
        attr("title", translate("removelabel")).
        appendTo(row);
    else
      $("<td>").appendTo(row);

    rows.push(row);
  }
  if (!rows.length) {
    alert(translate('noresourcessend2'));
    window.close();
    return;
  }
  $("#loading").remove();
  $("#resourceslist tbody").empty();
  for (var i = 0; i < rows.length; i++) {
    $("#resourceslist tbody").append(rows[i]);
  }
  // Make it sortable, initial sort sequence is first the filter column (4),
  // then the URL column (2)
  $("#resourceslist th:not(:empty)").click(sortTable);
  $("#resourceslist th[data-column='url']").click();
  $("#resourceslist th[data-column='filter']").click();

  $(".deleterule").click(function() {
    var resource = resources[$(this).prevAll('td[data-column="url"]')[0].title];
    BGcall('remove_custom_filter', custom_filters[resource.filter], function() {
      // If the filter was a hiding rule, it'll still show up since it's still in
      // frameData in the background. However, I consider that acceptable.
      if (getTypeName(resource.type) === "page") {
        alert(translate("excludefilterremoved"));
        window.close();
      } else
        document.location.reload();
    });
  });
}

// Converts the ElementTypes number back into an readable string
// or hiding or 'unknown' if it wasn't in ElementTypes.
// Inputs: One out of ElementTypes or 'undefined'
// Returns a string with the element type
function getTypeName(type) {
  switch(type) {
    case undefined: return "hiding";
    case ElementTypes.script: return "script";
    case ElementTypes.background:
    case ElementTypes.image: return "image";
    case ElementTypes.stylesheet: return "stylesheet";
    case ElementTypes.object: return "object";
    case ElementTypes.subdocument: return "subdocument";
    case ElementTypes.object_subrequest: return "object_subrequest";
    case ElementTypes.media: return "media";
    case ElementTypes.xmlhttprequest: return "xmlhttprequest";
    case ElementTypes.other: return "other";
    //Cheating with $document & $elemhide here to make it easier: they are considered 'the same'
    case ElementTypes.document | ElementTypes.elemhide: return "page";
    case ElementTypes.popup: return "popup";
    default: return "unknown";
  }
}

// Check an URL for it's validity
function validateUrl(url) {
  if (!/^https?:\/\//.test(url)) {
    window.close();
    return;
  }
}

// Checks if the text in the domain list textbox is valid or not
// Inputs: the text from the text box
// Returns true if the domain list was valid, false otherwise
function isValidDomainList(text) {
  if (!text)
    return false;
  try {
    var parsedDomains = Filter._domainInfo(text, "|");
    FilterNormalizer.verifyDomains(parsedDomains);
    return true;
  } catch(ex) {
    return false;
  }
}

// After getting annoyed by the time it takes to get the required data
// finally start generating some content for the user, and allowing him to
// do some things, instead of looking at 'LOADING'
function finally_it_has_loaded_its_stuff() {
  // Create the table of resources
  generateTable();

  // Add another background color when hovering
  $("#resourceslist tbody tr").mouseenter(function() {
    if ($(this).hasClass('selected'))
      return;
    $(this).children(":not(:first-child)").
      css("-webkit-transition", "all 0.3s ease-out").
      css("background-color", "rgba(242, 242, 242, 0.3)");
  });
  $("#resourceslist tr").mouseleave(function() {
    $(this).children().
      css("-webkit-transition", "all 0.3s ease-out").
      css("background-color", "white");
  });
}

$(function() {
  // Translation
  localizePage();

  var opts = {
    domain: parseUri(url || "x://y/").hostname
  };
  BGcall('storage_get', 'filter_lists', function(filter_lists) {
    for (var id in filter_lists) {
      if (filter_lists[id].subscribed &&
          filter_lists[id].text &&
          id !== "malware") {
        createResourceblockFilterset(id, filter_lists[id].text.split('\n'));
      } else if (id === "malware" &&
                 filter_lists[id].subscribed) {
        createResourceblockFilterset(id, []);
      }
    }

    BGcall('get_content_script_data', opts, function(data) {
      createResourceblockFilterset("build_in_filters",
            MyFilters.prototype.getExtensionFilters(data.settings));

      if (data.adblock_is_paused) {
        alert(translate("adblock_is_paused"));
        window.close();
        return;
      }
      if (!qps.itemUrl) {
        // Load all stored resources
        BGcall('resourceblock_get_frameData', qps.tabId, function(loaded_frames) {
          loaded_frames = loaded_frames || {};

          for (var thisFrame in loaded_frames) {
            var frame = loaded_frames[thisFrame];

            if ((Number(thisFrame) === 0 ||
                 Number(frame) === 0) &&
                frame.url) {
              // We don't parse $document and $elemhide rules for subframes
              resources[frame.url] = {
                type: ElementTypes.document | ElementTypes.elemhide,
                domain: frame.domain || loaded_frames.domain,
                resource: frame.url
              };
            }
            var resors = frame.resources || frame;
            for (var res in resors) {

              if (/^HIDE\:\|\:.+/.test(res)) {
                var filter = "##" + res.substring(7);
                resources[filter] = {
                  filter: filter,
                  domain: frame.domain || loaded_frames.domain,
                  resource: filter
                };
              } else {
                if (/\<|\"/.test(res))
                   continue;
                var blockmatches = res.split(':|:');
                if (blockmatches && blockmatches.length > 1 && blockmatches[1].indexOf(chrome.extension.getURL("")) === 0)
                  continue; // Blacklister resources shouldn't be visible
                if (!/^[a-z\-]+\:\/\//.test(blockmatches[1]))
                  continue; // Ignore about: and data: urls
                var elemType = Number(blockmatches[0]);
                if (elemType === ElementTypes.document)
                  continue;
                resources[blockmatches[1]] = {
                  type: elemType,
                  domain: frame.domain || loaded_frames.domain,
                  resource: blockmatches[1]
                };
              }
            }
          }
          continue_after_another_async_call();
        });
      } else
        continue_after_another_async_call();

      function continue_after_another_async_call() {
        BGcall('get_custom_filters_text', function(filters) {
          filters = filters.split('\n');
          for (var i=0; i<filters.length; i++)
            try {
              var normalized = FilterNormalizer.normalizeLine(filters[i]);
              if (normalized) // filter out comments and ignored filters
                custom_filters[normalized] = filters[i];
            } catch(ex) {} //Broken filter
          createResourceblockFilterset("user_custom_filters", Object.keys(custom_filters));
          finally_it_has_loaded_its_stuff();
          // If opened by the context menu, this variable exists
          if (qps.itemUrl) {
            if ($("#resourceslist input").prop("disabled")) {
              // In case the resource has been whitelisted and can't be removed
              if ($(".deleterule").length === 0) {
                alert(translate('resourceiswhitelisted'));
                window.close();
                return;
              }
              $("#legend").show();
            } else
              $("#resourceslist input").click();
            $("#choosedifferentresource").remove();
          } else
            $("#legend").show();
        });
      }
    });
  });
});

// Click event for the column titles (<th>) of a table.
// It'll sort the table upon the contents of that column
sortTable = function() {
  var table = $(this).closest('table');
  if (table.find('[colspan]').length)
    return; // can't handle the case where some columns have been merged locally
  var columnNumber = $(this).prevAll().length + 1;
  if ($(this).attr("data-sortDirection") === "ascending") {
    $(this).attr("data-sortDirection", "descending"); // Z->A
  } else {
    $(this).attr("data-sortDirection", "ascending"); // A->Z
  }
  var cellList = [];
  var rowList = [];
  $("td:nth-of-type(" + columnNumber + ")", table).each(function(index, element) {
    cellList.push(element.innerHTML.toLowerCase() + 'ÿÿÿÿÿ' + (index+10000));
    rowList.push($(element).parent('tr').clone(true));
  });
  cellList.sort();
  if ($(this).attr("data-sortDirection") === "descending")
    cellList.reverse();
  $("tbody", table).empty();
  cellList.forEach(function(item) {
    var no = Number(item.match(/\d+$/)[0]) - 10000;
    $("tbody", table).append(rowList[no]);
  });
};

*/