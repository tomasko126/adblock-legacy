// NOTE: include functions.js
onReady(function(){
  function markDisplayNone(markedElements) {
    for (i = 0; i < markedElements.length; i++) {
      markedElements[i].style.display = 'none';
    }
  }
  function deleteHidingStyleTag() {
    if (typeof(GLOBAL_addata_style_tag) !== 'undefined') {
      GLOBAL_addata_style_tag.parentNode.removeChild(GLOBAL_addata_style_tag);
    }
  }
  // NOTE: manifest.json will say we only run on google search results pages
  // TODO: update manifest.json with the URLs Google gives us
  BGcall('adDataUserGroup', function(user_group) {
    if (user_group === 'experiment-opt-in' || user_group === 'experiment-opt-out') {
      var marked_elements = document.querySelectorAll("[data-t='t']");
      // Delete style tag only if page is participating
      if (marked_elements.length > 0) {
        if (user_group === 'experiment-opt-out') {
          markDisplayNone(marked_elements);
        }
        deleteHidingStyleTag();
      }
    }
  });
});
