$(document).ready(function(){
  localizePage();
  $("#disableacceptableads").click(function(event){
    event.preventDefault();
    BGcall("openTab",  "options/index.html?tab=0&unsubscribe-aa=true");
  });
  $("#disableacceptableads2").click(function(event){
    event.preventDefault();
    BGcall("openTab",  "options/index.html?tab=0&unsubscribe-aa=true");
  });
  $("#moredetails").click(function(event){
    event.preventDefault();
    $("#details_section").slideDown();
  });
  $("#moreinformation").click(function(event){
    event.preventDefault();
    BGcall("openTab",  "https://adblockplus.org/acceptable-ads");
  });
});