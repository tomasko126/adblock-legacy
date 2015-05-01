StyleCache = (function() {
  var CACHE_SIZE_LIMIT = 1000;
  var getStyleCache = function() {
    return storage_get('styleCache') || {};
  };
  var saveStyleCache = function(newValue) {
    storage_set("styleCache", newValue);
  };
  return {
    reset: function() {
      saveStyleCache({});
    },
    getSelectors: function(options) {
      if (!get_settings().experimental_hiding) {
        return undefined;
      }
      var styleCache = getStyleCache();
      if (styleCache[options.domain] && styleCache[options.domain].selectors) {
        log("style cache hit", options.domain);
        return styleCache[options.domain].selectors;
      } else {
        return undefined;
      }
    },
    update_style_cache: function(matchedSelectors, hostname) {
      if (!get_settings().experimental_hiding) {
        return;
      }
      if (matchedSelectors &&
        hostname) {
        function removeDuplicates(myArray) {
          var seen = {};
          var out = [];
          var len = myArray.length;
          var j = 0;
          for(var i = 0; i < len; i++) {
            var item = myArray[i];
            if(seen[item] !== 1) {
              seen[item] = 1;
              out[j++] = item;
            }
          }
          return out;
        }
        var styleCache = getStyleCache();
        //limit the size of the cache.
        //if the number of elements in the cache exceed the limit, then
        // remove the oldest elements (~ 10% reduction)
        if (Object.keys(styleCache).length > CACHE_SIZE_LIMIT) {
          idleHandler.scheduleItemOnce(function() {
            var styleCache = getStyleCache();
            var currentSize = Object.keys(styleCache).length;
            //since this function can be schedule multiple times,
            //a previous execution may have already removed the old elements
            if (currentSize < CACHE_SIZE_LIMIT) {
              return;
            }
            var numItemsToRemove = (currentSize - (CACHE_SIZE_LIMIT * .9));
            if (numItemsToRemove < 1) {
              return;
            }
            //create a temporary array to be sorted by the last update timestamp
            var tuples = [];
            for (var key in styleCache) {
              tuples.push([key, styleCache[key].lastUpdate]);
            }
            //sort the temporary array.
            tuples.sort(function(a, b) {
              var aLastUpdate = a[1];
              var bLastUpdate = b[1];
              return aLastUpdate < bLastUpdate ? -1 : (aLastUpdate > bLastUpdate ? 1 : 0);
            });
            //delete the old elements from the cache
            for (var i = 0; i < numItemsToRemove; i++) {
              delete styleCache[tuples[i][0]];
            }
            //save the update style cache
            storage_set('styleCache', styleCache);
          });
        }
        if (styleCache[hostname] && styleCache[hostname].selectors) {
          styleCache[hostname].selectors.concat(matchedSelectors);
          styleCache[hostname].selectors = removeDuplicates(styleCache[hostname].selectors);
        } else {
          styleCache[hostname] = {};
          styleCache[hostname].selectors = matchedSelectors;
        }
        styleCache[hostname].lastUpdate = Date.now();
        saveStyleCache(styleCache);
      }
    },
  };
})();