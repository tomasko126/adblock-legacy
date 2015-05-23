SelectorsCache = {
    _selectorsCache: {},

    // Save recorded selectors into cache
    setSelectors: function(url, selectors) {
        var urlDomain = parseUri(url).hostname.replace(/^www./, "");
        console.log("Pushing selectors ", selectors, "to URL: ", url, urlDomain);

        if (!this._selectorsCache[urlDomain]) {
            this._selectorsCache[urlDomain] = [];
            this.cacheFilterListSelectors(urlDomain);
        }

        for (var i=0; i<selectors.length; i++) {
            this._selectorsCache[urlDomain].push(selectors[i]);
        }

        storage_set("cached_filters", this._selectorsCache);
    },

    // Save selectors from filter lists to cache
    cacheFilterListSelectors: function(domain) {
        var selectors = _myfilters.hiding._viewFor(domain).items[domain];
        if (selectors) {
            for (var i=0; i<selectors.length; i++) {
                this._selectorsCache[domain].push(selectors[i].selector);
            }
        }
    },

    // Get recorded selectors from cache
    getSelectors: function(url) {
        var urlDomain = parseUri(url).hostname.replace(/^www./, "");
        if (this._selectorsCache[urlDomain])
            return this._selectorsCache[urlDomain];

        return null;
    },

    // Delete cached selectors
    reset: function() {
        this._selectorsCache = {};
        storage_set("cached_filters", this._selectorsCache);
    }
}