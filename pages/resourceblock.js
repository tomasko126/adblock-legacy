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

                var selectors = [];

                for (var frameId in data) {
                    var frame = data[frameId];
                    var frameResources = frame.resources;
                    var frameDomain = frame.domain;

                    for (var resource in frameResources) {
                        var res = frameResources[resource];
                        if (res.reqType === "HIDE") {
                            for (var filterList in filterLists) {
                                // Don't check selector against malware filter list
                                if (filterList === "malware") {
                                    continue;
                                }
                                var filterListText = filterLists[filterList].text;
                                for (var i=0; i<filterListText.length; i++) {
                                    var filter = filterListText[i];
                                    if (filter.search(resource+"$") > -1) {
                                        res.blockedData = [];
                                        res.blockedData["filterList"] = filterList;
                                        res.blockedData["text"] = filter;
                                        res.frameUrl = frame.url;
                                        res.frameDomain = frameDomain;
                                        selectors.push(res);
                                    }
                                }
                            }
                        } else {
                            var urlDomain = parseUri(resource).hostname;
                            res.frameDomain = frameDomain;
                            res.thirdParty = BlockingFilterSet.checkThirdParty(urlDomain, frameDomain);
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
                }
                createTable(data);
            });
        });
    });
});

// TODO: Better naming
function createFrameUI(domain, url, frameId) {
    var elem = null, frameType = null;

    if (frameId === "0") {
        elem = "#header";
        frameType = "Top frame";
    } else {
        var el = document.querySelectorAll(".resourceslist").length;
        elem = document.querySelectorAll(".resourceslist")[el-1];
        frameType = "Subframe";
    }

    $(elem).after(
        '<table data-href=' + domain + ' data-frameid=' + frameId + ' class="resourceslist">' +
            '<thead>' +
                '<tr>' +
                    '<th class="frametype">' + 'Frame type: ' + frameType + '<\/th>' +
                '<\/tr>' +
                '<tr>' +
                    '<th class="framedomain">' + 'Frame domain: ' + domain + '<\/th>' +
                '<\/tr>' +
                '<tr>' +
                    '<th class="frameurl" title="' + url + '">' + 'Frame url: ' + truncateURI(url) + '<\/th>' +
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

// Now create that table row-by-row
function createTable(frames) {
    // TODO: Sometimes, there is topframe and subframe with same URLs, adjust this behaviour!
    var data = {};
    for (var frame in frames) {
        var frameObject = frames[frame];
        if (typeof frameObject === "number")
            continue;
        // TODO: Create UI for sub_frames without resources
        var length = Object.keys(frameObject.resources).length;
        if (length === 0)
            continue;
        for (var resource in frameObject["resources"]) {
            var res = frameObject["resources"][resource];
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
            // TODO: i18n?
            text(res.reqType === "HIDE" ? "selector" : res.reqType).
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
        createFrameUI(frameObject.domain, frameObject.url, frame);
    }

    // Append resource to according table
    for (var domain in data) {
        for (var i=0; i<data[domain].length; i++) {
            var resource = data[domain][i];
            $('[data-href="' + domain + '"] tbody').append(resource);
        }
    }

    // Localize page
    localizePage();

    // Enable table sorting
    $("th[data-column='url']").click(sortTable);
    $("th[data-column='type']").click(sortTable);
    $("th[data-column='filter']").click(sortTable);
    $("th[data-column='thirdparty']").click(sortTable);
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