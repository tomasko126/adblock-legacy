// Content script when Safari content blocking API is used
console.log("content blocking");
		adblock_begin({
		  startPurger: function() {

		  },
		  stopPurger: function() {

		  },
		  handleHiding: function(data) {

		  },
		  success: function() {
		    // Add entries to right click menu of non-whitelisted pages.
		    window.addEventListener("contextmenu", function(event) {
		      safari.self.tab.setContextMenuEventUserInfo(event, true);
		    }, false);
		  }
		});
