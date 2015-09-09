$(document).ready(function(){
  $("#disableacceptableads").click(function(event){
    event.preventDefault();
    BGcall("openTab",  "options/index.html?tab=0");
  });
  $("#disableacceptableads2").click(function(event){
    event.preventDefault();
    BGcall("openTab",  "options/index.html?tab=0");
  });
  $("#moredetails").click(function(event){
    event.preventDefault();
    $("#details_section").css("display", "block");
  });
  $("#moreinformation").click(function(event){
    event.preventDefault();
    BGcall("openTab",  "https://adblockplus.org/acceptable-ads");
  });
});