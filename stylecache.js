StyleCache = (function() {
  var CACHE_SIZE_LIMIT = 1000;
  var getStyleCache = function() {
    return storage_get('styleCache') || {};
  };
  return {
    reset: function() {
      if (!get_settings().experimental_hiding) {
        return;
      }
      storage_set("styleCache", {});
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
        //need to remove old elements ~ 10%
        if (Object.keys(styleCache).length > CACHE_SIZE_LIMIT) {
          idleHandler.scheduleItemOnce(function() {
            var styleCache = getStyleCache();
            var currentSize = Object.keys(styleCache).length;
            if (currentSize < CACHE_SIZE_LIMIT) {
              return;
            }
            var numItemsToRemove = (currentSize - (CACHE_SIZE_LIMIT * .9));
            if (numItemsToRemove < 1) {
              return;
            }
            var tuples = [];
            for (var key in styleCache) {
              tuples.push([key, styleCache[key]]);
            }
            //sort the new array by the lastUpdate timestamps.
            tuples.sort(function(a, b) {
              var aLastUpdate = a[1].lastUpdate;
              var bLastUpdate = b[1].lastUpdate;
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
        } else {
          styleCache[hostname] = {};
          styleCache[hostname].selectors = matchedSelectors;
        }
        styleCache[hostname].selectors = removeDuplicates(styleCache[hostname].selectors);
        styleCache[hostname].lastUpdate = Date.now();
        storage_set('styleCache', styleCache);
      }
    },
  };
})();