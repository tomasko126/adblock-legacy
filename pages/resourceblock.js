"use strict";

// Get tabId from URL
var tabId = parseUri.parseSearch(document.location.href).tabId;
tabId = parseInt(tabId);

// Convert element type to request type
function reqTypeForElement(elType) {
    switch (elType) {
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

// Get frameData object
BGcall("get_frameData", tabId, function(frameData) {
    if (!frameData) {
        alert(translate('noresourcessend2'));
        window.close();
        return;
    }

    BGcall("storage_get", "filter_lists", function(filterLists) {
        // TODO: Excluded filters & excluded hiding filters?
        for (var id in filterLists) {
            // Delete every filter list, which is not in use
            if (!filterLists[id].subscribed) {
                delete filterLists[id];
                continue;
            }
            if (id !== "malware") {
                filterLists[id].text = FilterNormalizer.normalizeList(filterLists[id].text).split("\n");
            }
        }

        var opts = {
            domain: parseUri(document.location.href).hostname
        };

        BGcall("get_content_script_data", opts, function(arg) {

            // Process AdBlock's own filters (if any)
            filterLists["AdBlock"] = {};
            filterLists.AdBlock.text = MyFilters.prototype.getExtensionFilters(arg.settings);

            BGcall("storage_get", "custom_filters", function(filters) {

                // Process custom filters (if any)
                if (filters) {
                    filterLists["Custom"] = {};
                    filterLists["Custom"].text = FilterNormalizer.normalizeList(filters).split("\n");
                }

                // Loop through every frameId in frameData;
                // If resource/ad has been blocked/whitelisted/hidden,
                // get its matching filter/selector and name of the filter list,
                // where is matching filter/selector coming from
                for (var frameId in frameData) {
                    var frame = frameData[frameId];
                    var frameResources = frame.resources;
                    var frameDomain = frame.domain;

                    // Process each resource
                    for (var resource in frameResources) {
                        var res = frameResources[resource];
                        // Selector resource
                        if (reqTypeForElement(res.elType) === "selector") {
                            for (var filterList in filterLists) {
                                // Don't check selector against malware filter list
                                if (filterList === "malware") {
                                    continue;
                                }
                                var filterListText = filterLists[filterList].text;
                                for (var i=0; i<filterListText.length; i++) {
                                    var filter = filterListText[i];
                                    // Don't check selector against non-selector filters
                                    if (!Filter.isSelectorFilter(filter))
                                        continue;
                                    if (filter.indexOf(resource) > -1) {
                                        // If |filter| is global selector filter,
                                        // it needs to be the same as |resource|.
                                        // If it is not the same as |resource|, keep searching for a right |filter|
                                        if ((filter.split("##")[0] === "" && filter === resource) ||
                                            filter.split("##")[0].indexOf(frameDomain) > -1) {
                                            // Shorten lengthy selector filters
                                            if (filter.split("##")[0] !== "") {
                                                filter = frameDomain + resource;
                                            }
                                            res.blockedData = {};
                                            res.blockedData["filterList"] = filterList;
                                            res.blockedData["text"] = filter;
                                            res.frameUrl = frame.url;
                                            res.frameDomain = frameDomain;
                                            break;
                                        }
                                    }
                                }
                            }
                        } else {
                            // Non-selector resource (blocked/whitelisted/unmodified)
                            var urlDomain = parseUri(resource).hostname;
                            res.frameDomain = frameDomain;
                            res.thirdParty = BlockingFilterSet.checkThirdParty(urlDomain, frameDomain);
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
                        }
                    }
                }
                // Process all requests
                processRequests(frameData);
            });
        });
    });
});

// Create a new table for frame
function createTableUI(domain, url, frameId) {
    var elem = null, frameType = null, frameUrls = $(".frameurl");

    // Don't create another table with the same url,
    // when we've already created one
    for (var i=0; i<frameUrls.length; i++) {
        var frameUrl = frameUrls[i].title;
        if (url === frameUrl) {
            return;
        }
    }

    // Sort tables
    if (frameId === "0") {
        elem = "#legend";
        frameType = translate("topframe");
    } else {
        var len = document.querySelectorAll(".resourceslist").length;
        elem = document.querySelectorAll(".resourceslist")[len-1];
        frameType = translate("subframe");
    }

    $(elem).after(
        '<table data-href=' + domain + ' data-frameid=' + frameId + ' class="resourceslist">' +
            '<thead>' +
                '<tr>' +
                    '<th class="frametype">' + translate("frametype") + frameType + '<\/th>' +
                '<\/tr>' +
                '<tr>' +
                    '<th class="framedomain">' + translate("framedomain") + domain + '<\/th>' +
                '<\/tr>' +
                '<tr>' +
                    '<th class="frameurl" title="' + decodeURIComponent(url) + '">' +
                        translate("frameurl") + decodeURIComponent(truncateURI(url)) +
                    '<\/th>' +
                '<\/tr>' +
                '<tr>' +
                    '<th style="height: 10px;"></th>' +
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

// Process each request and add it to table
function processRequests(frames) {
    var data = {};
    for (var frame in frames) {
        var frameObject = frames[frame];
        // Don't process number of blocked ads (blockCount)
        if (typeof frameObject === "number") {
            continue;
        }
        for (var resource in frameObject["resources"]) {
            var res = frameObject["resources"][resource];
            res.url = resource;

            // Don't show main_frame resource, unless it's excluded by $document or $elemhide
            if ((reqTypeForElement(res.elType) === "main_frame") && (!res.blockedData || !res.blockedData.blocked)) {
                continue;
            }

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

            if (!data[frames[frame].domain]) {
                data[frames[frame].domain] = [];
            }

            data[frames[frame].domain].push(row);
        }

        // Create table for each frame
        createTableUI(frameObject.domain, frameObject.url, frame);
    }

    // Append resource to according table
    for (var domain in data) {
        for (var i=0; i<data[domain].length; i++) {
            var resource = data[domain][i];
            $('[data-href="' + domain + '"] tbody').append(resource);
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
}

// Truncate long URIs
function truncateURI(uri) {
    if (uri.length > 80) {
        return uri.substring(0, 75) + '[...]';
    }
    return uri;
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