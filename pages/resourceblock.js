"use strict";

// Get tabId from URL
var tabId = parseUri.parseSearch(document.location.href).tabId;
tabId = parseInt(tabId);

// Convert element type to request type
function reqTypeForElement(elType) {
    switch (parseInt(elType)) {
        case 1:    return "script";
        case 2:    return "image";
        case 4:    return "background";
        case 8:    return "stylesheet";
        case 16:   return "object";
        case 32:   return "sub_frame";
        case 64:   return "object_subrequest";
        case 128:  return "media";
        case 256:  return "other";
        case 512:  return "xmlhttprequest";
        case 1024: return "main_frame";
        case 2048: return "elemhide";
        case 4096: return "popup";
        default:   return "selector";
    }
}

// Reset cache for getting matched filter text properly
BGcall("reset_matchCache", function(matchCache) {
    // Get frameData object
    BGcall("get_frameData", tabId, function(frameData) {
        if (!frameData || Object.keys(frameData["0"].resources).length === 0) {
            alert(translate('noresourcessend2'));
            window.close();
            return;
        } else {
            BGcall("storage_get", "filter_lists", function(filterLists) {
                // TODO: Excluded filters & excluded hiding filters?
                for (var id in filterLists) {
                    // Delete every filter list we are not subscribed to
                    if (!filterLists[id].subscribed) {
                        delete filterLists[id];
                        continue;
                    }
                    // Process malware filter list separately
                    if (id !== "malware") {
                        filterLists[id].text = filterLists[id].text.split("\n");
                    }
                }

                BGcall("get_settings", function(settings) {
                    // Process AdBlock's own filters (if any)
                    filterLists["AdBlock"] = {};
                    filterLists.AdBlock.text = MyFilters.prototype.getExtensionFilters(settings);

                    BGcall("storage_get", "custom_filters", function(filters) {
                        // Process custom filters (if any)
                        if (filters) {
                            filterLists["Custom"] = {};
                            filterLists["Custom"].text = FilterNormalizer.normalizeList(filters).split("\n");
                        }

                        // Pre-process each resource - extract data from its name
                        // and add them into resource's object for easier manipulation
                        for (var frameId in frameData) {
                            var frame = frameData[frameId];
                            var frameResources = frame.resources;
                            var frameDomain = frame.domain;

                            // Process each resource
                            for (var resource in frameResources) {
                                var res = frameResources[resource] = {};

                                res.elType = resource.split(":|:")[0];
                                res.url = resource.split(":|:")[1];
                                res.frameDomain = resource.split(":|:")[2].replace("www.", "");

                                if (res.elType !== "selector") {
                                    res.thirdParty = BlockingFilterSet.checkThirdParty(parseUri(res.url).hostname, res.frameDomain);
                                }
                            }
                        }

                        // Find out, whether resource has been blocked/whitelisted,
                        // if so, get the matching filter and filter list,
                        // where is the matching filter coming from
                        BGcall("process_frameData", frameData, function(processedData) {
                            for (var frameId in processedData) {
                                var frame = processedData[frameId];
                                var frameResources = frame.resources;

                                for (var resource in frameResources) {
                                    var res = frameResources[resource];
                                    if (res.elType !== "selector") {
                                        if (res.blockedData && res.blockedData !== false && res.blockedData.text) {
                                            var filter = res.blockedData.text;
                                            for (var filterList in filterLists) {
                                                if (filterList === "malware") {
                                                    if (filterLists[filterList].text.adware.indexOf(filter) > -1) {
                                                        res.blockedData["filterList"] = filterList;
                                                    }
                                                } else {
                                                    var filterListText = filterLists[filterList].text;
                                                    for (var i=0; i<filterListText.length; i++) {
                                                        var filterls = filterListText[i];
                                                        if (filterls === filter) {
                                                            res.blockedData["filterList"] = filterList;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    } else {
                                        for (var filterList in filterLists) {
                                            // Don't check selector against malware filter list
                                            if (filterList === "malware") {
                                                continue;
                                            }
                                            var filterListText = filterLists[filterList].text;
                                            for (var i=0; i<filterListText.length; i++) {
                                                var filter = filterListText[i];
                                                // Don't check selector against non-selector filters
                                                if (!Filter.isSelectorFilter(filter)) {
                                                    continue;
                                                }
                                                if (filter.indexOf(res.url) > -1) {
                                                    // If |filter| is global selector filter,
                                                    // it needs to be the same as |resource|.
                                                    // If it is not the same as |resource|, keep searching for a right |filter|
                                                    if ((filter.split("##")[0] === "" && filter === res.url) ||
                                                        filter.split("##")[0].indexOf(res.frameDomain) > -1) {
                                                        // Shorten lengthy selector filters
                                                        if (filter.split("##")[0] !== "") {
                                                            filter = res.frameDomain + res.url;
                                                        }
                                                        res.blockedData = {};
                                                        res.blockedData["filterList"] = filterList;
                                                        res.blockedData["text"] = filter;
                                                        res.frameUrl = frame.url;
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            // Add previously cached requests to matchCache
                            BGcall("add_to_matchCache", matchCache, function() {
                                addRequestsToTables(processedData);
                            });
                        });
                    });
                });
            });
        }
    });
});


// Process each request and add it to table
function addRequestsToTables(frames) {
    for (var frame in frames) {
        var frameObject = frames[frame];

        // Don't process number of blocked ads (blockCount)
        if (typeof frameObject === "number") {
            continue;
        }

        // Create a table for each frame
        createTable(frameObject, frame);

        // Process each request
        for (var resource in frameObject["resources"]) {
            var res = frameObject["resources"][resource];

            // Don't show main_frame resource, unless it's excluded by $document or $elemhide
            if ((reqTypeForElement(res.elType) === "main_frame") && (!res.blockedData || !res.blockedData.blocked)) {
                continue;
            }

            // Create a row for each request
            var row = $("<tr>");

            if (reqTypeForElement(res.elType) === "selector") {
                row.addClass("hiding");
            } else if (res.blockedData) {
                if (res.blockedData.blocked) {
                    row.addClass("blocked");
                } else {
                    row.addClass("whitelisted");
                }
            }

            // Cell 1: URL
            $("<td>").
            attr("title", res.url).
            attr("data-column", "url").
            text(truncateURI(res.url)).
            appendTo(row);

            // Cell 2: Type
            $("<td>").
            attr("data-column", "type").
            css("text-align", "center").
            text(translate("type" + reqTypeForElement(res.elType))).
            appendTo(row);

            // Cell 3: Matching filter
            var cell = $("<td>").
            attr("data-column", "filter").
            css("text-align", "center");
            if (res.blockedData && res.blockedData.text && res.blockedData.filterList) {
                $("<span>").
                text(truncateURI(res.blockedData.text)).
                attr('title', translate("filterorigin", translate("filter" + res.blockedData.filterList))).
                appendTo(cell);
            }
            row.append(cell);

            // Cell 4: third-party or not
            var cell = $("<td>").
            text(res.thirdParty ? translate("yes") : translate("no")).
            attr("title", translate("resourcedomain", res.frameDomain)).
            attr("data-column", "thirdparty").
            css("text-align", "center");
            row.append(cell);

            // Finally, append processed resource to the relevant table
            $('[data-href="' + frameObject.domain + '"] tbody').append(row);
        }
    }

    // Remove loading icon
    $(".loader").fadeOut();

    // Localize page
    localizePage();
    $(".legendtext").text(translate("legend"));
    $("span.blocked").text(translate("blockedresource"));
    $("span.whitelisted").text(translate("whitelistedresource"));
    $("span.hiding").text(translate("hiddenelement"));

    // Show us the legend
    $("#legend").fadeIn();

    // Enable table sorting
    $("th[data-column='url']").click(sortTable);
    $("th[data-column='type']").click(sortTable);
    $("th[data-column='filter']").click(sortTable);
    $("th[data-column='thirdparty']").click(sortTable);

    // Sort table to see, what was either blocked/whitelisted or hidden
    $("th[data-column='filter']").click();

    // Finally, show us the tables!
    $("table").fadeIn();

    initClickHandler();
};

function generateSuggestions(url) {
    // Make up suggestions
    var suggestions = [];
    suggestions.push(url);

    if (url.indexOf("#") > 0) {
        var index = url.indexOf("#");
        url = url.substring(0, index);
        suggestions.push(url);
    }

    if (url.indexOf("?") > 0) {
        var index = url.indexOf("?");
        url = url.substring(0, index);
        suggestions.push(url);
    }

    var splitted = url.split("/");
    for (var i=1; i<splitted.length; i++) {
        var index = url.lastIndexOf("/");
        url = url.substring(0, index);
        if (suggestions.indexOf(url + "/") === -1) {
            suggestions.push(url + "/");
        }
    }

    var rootDomain = parseUri.secondLevelDomainOnly(url, true);
    if (rootDomain !== url) {
        suggestions.push("*." + rootDomain);
    }

    // Sort suggested URLs
    suggestions = suggestions.sort(function(a, b) {
        return b.length - a.length;
    });

    // Reverse suggestions
    suggestions.reverse();

    return suggestions;
}

function initClickHandler() {

    $("td[data-column='url']").click(function(event) {
        // Contains URL of selected resource
        var url = event.target.title;

        // Get blocking/whitelisting/hiding filter
        var filter = event.target.parentNode.childNodes[2].innerText;

        // Has this resource been whitelisted/blocked/hidden?
        var isSelector = Filter.isSelectorFilter(filter);
        var isWhitelisted = Filter.isWhitelistFilter(filter);
        var isBlocked = !isWhitelisted && !isSelector && filter !== "";
        var isUntouched = !isSelector && !isWhitelisted && !isBlocked;

        // Remove protocols from URL
        url = url.replace(/^[a-z\-]+\:\/\/(www\.)?/, '');
        url = truncateURI(url, true);

        // TODO: ID?
        $("#customfilter").val(url);

        // Generate suggestions
        var suggestions = generateSuggestions(url);

        // Remove any suggestion created before
        $("#suggestions").empty();

        // If selected resource hasn't been blocked,
        // hide section for disabling filter
        if (filter === "") {
            $("#disablefilter").hide();
        } else {
            $("label[for='disablefilterbtn']").text(filter);
        }

        if (isSelector) {
            $("#selectblockableurl, #createownfilter").hide();
        }

        if (isBlocked) {
            $("#selectblockableurlheader").text("Whitelist every resource containing:");
            $("#disablefilterheader").text("... or disable following blocking filter:");
        } else if (isWhitelisted) {
            $("#selectblockableurlheader").text("Block every resource containing:");
        } else if (isSelector) {
            $("#disablefilterheader").text("Disable following hiding filter:");
        } else if (isUntouched) {
            $("#selectblockableurlheader").text("Block every resource containing:");
        }

        // Check first option automatically
        $("#sliderbtn").prop("checked", true);

        // Show first overlay
        $("#overlay1").addClass("show");
        $("#cover").fadeIn();

        // Set up slider
        $("#slider").
        attr("max", suggestions.length - 1).
        attr("step", "1").
        val(suggestions.length);

        // TODO: ID
        $("#test").text(suggestions[suggestions.length - 1]);

        // Change suggestions according to position of slider
        $("#slider").on("input change", function(event) {
            $("#test").text(suggestions[this.valueAsNumber]);
        });

        // Uncheck previously checked radio buttons
        $("input[type='radio']").click(function() {
            var clicked = $(this).attr("id");
            $("input[type='radio']:checked", "#options1").each(function() {
                var uncheck = $(this).attr("id");
                if (clicked !== uncheck) {
                    $(this).prop("checked", false);
                }
            });
        });

        $("#next").click(function() {
            var checked = $("input[type='radio']:checked", "#options1").attr("id");
            $("#overlay1").removeClass("show");
            $("#overlay2").addClass("show");
        });

        $("#back").click(function() {
            $("#overlay2").removeClass("show");
            $("#overlay1").addClass("show");
        });

        $("#cover").click(function() {
            $("#overlay1, #overlay2").removeClass("show");
            $("#cover").fadeOut(function() {
                $("#disablefilter").show();
                $("#test").text("");
                $("#selectblockableurl, #createownfilter").show();
            });
        });

    });
}

// Create a new table for frame
function createTable(frame, frameId) {
    var elem = null, frameType = null;

    // Main frame table is always on top of the page
    if (frameId === "0") {
        elem = "#legend";
        frameType = translate("topframe");
    } else {
        var len = document.querySelectorAll(".resourceslist").length;
        elem = document.querySelectorAll(".resourceslist")[len-1];
        frameType = translate("subframe");
    }

    // Insert table to page
    // TODO: l10n of #noadditionalresources
    $(elem).after(
        '<table data-href=' + frame.domain + ' data-frameid=' + frameId + ' class="resourceslist">' +
            '<thead>' +
                '<tr>' +
                    '<th class="frametype">' + translate("frametype") + frameType + '<\/th>' +
                '<\/tr>' +
                '<tr>' +
                    '<th class="framedomain">' + translate("framedomain") + frame.domain + '<\/th>' +
                '<\/tr>' +
                '<tr>' +
                    '<th class="frameurl" title="' + decodeURIComponent(frame.url) + '">' +
                        translate("frameurl") + truncateURI(frame.url) +
                    '<\/th>' +
                '<\/tr>' +
                '<tr id="noadditionalresources">' +
                    '<th>No additional resources have been requested by this frame.</th>' +
                '<\/tr>' +
                '<tr id="headers">' +
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

    // Show a message, that no resources
    // have been requested by this frame
    var resourcesLength = Object.keys(frame.resources).length;
    if (resourcesLength === 0) {
        $('[data-frameid="' + frameId + '"] > thead > #headers').hide();
        $('[data-frameid="' + frameId + '"] > thead > #noadditionalresources').show();
    }
}

// Click event for the column titles (<th>) of a table.
// It'll sort the table upon the contents of that column
function sortTable() {
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

// Truncate long URIs
function truncateURI(uri, longer) {
    if (longer && uri.length > 115) {
        return uri.substring(0, 120) + '[...]';
    } else if (uri.length > 80) {
        return uri.substring(0, 75) + '[...]';
    }
    return uri;
};
