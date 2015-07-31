DataCollection = (function() {

  //setup memory cache  
  var _dataCollectionCache = {};

  var that = this;

  //if enabled, startup periodic saving of memory cache &
  //sending of data to the log server
  if (get_settings().data_collection) {
    window.setInterval(
      function() {
        idleHandler.scheduleItemOnce(function() {
          console.log("interval expired", get_settings().data_collection, Object.keys(_dataCollectionCache).length);
            if (get_settings().data_collection &&
                _dataCollectionCache &&
                Object.keys(_dataCollectionCache).length > 0) {
              data = JSON.stringify({ locale: determineUserLanguage,
                      filterStats: _dataCollectionCache })
              console.log("send data:", data, " to log server ");
              recordAnonymousMessage(data, 'general');
              //reset memory cache
              _dataCollectionCache = {};
            }
        });
      },
      //TODO - update this value
      1 * 60 * 1000
    );
  }

  return {
    addItem: function(filterText) {
      if (get_settings().data_collection) {
        console.log("adding item", filterText, (typeof filterText), Object.keys(_dataCollectionCache).length) 
        if (filterText && (typeof filterText === "string")) {
          if (filterText in _dataCollectionCache) {
            _dataCollectionCache[filterText] = _dataCollectionCache[filterText] + 1;
          } else {
            _dataCollectionCache[filterText] = 1;
          }
        }
      }
    }
  }
})();