$(function() {
    localizePage();
});

// Get debug info
var debug_info;
BGcall("getDebugInfo", function(info) {
  debug_info = info;
});

// Allow easier access to input boxes
var $name = $("#name");
var $email = $("#email");
var $title = $("#summary");
var $repro = $("#repro-steps");
var $expect = $("#expected-result");
var $actual = $("#actual-result");
var $comments = $("#other-comments");


var sendReport = function(){
  var report_data = {
      title: $title.val(),
      repro: $repro.val(),
      expect: $expect.val(),
      actual: $actual.val(),
      debug: debug_info,
      name: $name.val(),
      email: $email.val(),
			comments: $comments.val()
  };
	$.ajax({
    url: "http://localhost/freshdesk/bugReport.php",
    data: {
			bug_report: JSON.stringify(report_data)
		},
    success: function(json){
      console.log(json)
    },
    error: function(xhrInfo, status, HTTPerror){
      // As backup, send them to the old way of reporting a bug.
      var errors = storage_get("bugreport_errors");
      errors.ajax.push(status);
      errors.http.push(HTTPerror);
      storage_set("bugreport_errors", errors);
      // Make manual report in case the server goes down
      var report_data = [];
      var summary = $title.val();
      var name = $name.val();
      var email = $email.val();
      var private = $private.prop("checked");
      report_data.push('Seems like the automatic reporting didn\'t work. Just answer the spam-check question and click "Create" below.');
      report_data.push("AdBlock Team: please check the error details at the bottom of the debug info");
      report_data.push("");
      report_data.push("**Repro Steps:**");
      report_data.push($repro.val());
      report_data.push("");
      report_data.push("**Expected results:**");
      report_data.push($expect.val());
      report_data.push("");
      report_data.push("**Actual results:**");
      report_data.push($actual.val());
      report_data.push("");
      report_data.push("**Debug info:**");
      report_data.push(debug_info);
      report_data.push("");
      report_data.push("==== API Error ====");
      report_data.push("jQuery status: " + status);
      report_data.push("HTTP message: " + HTTPerror);
      report = report_data.join("  \n");
      var url = "https://support.getadblock.com/support/tickets/new";
		},
    type: "POST"
  });
}

// Step 1: Name & Email
$("#step1-next").click(function(){
  // Check for errors
  var s1_problems = 0;
  if ($name.val() === ""){
    s1_problems++;
    $name.addClass("inputError");
  }
  if ($email.val() === ""){
    s1_problems++;
    $email.addClass("inputError");
  }
  if (s1_problems === 0){
    // Success - go to next step
    $(this).prop("disabled", true);
    $("#email, #name").prop("disabled", true);
    $(".inputError").removeClass("inputError");
    $("#step_repro_info").fadeIn();
    $(".missingInfoMessage").hide();
    // Auto-scroll to bottom of the page
    $("html, body").animate({ scrollTop: 15000 }, 50);
  }
  else{
    // Failure - let them know there's an issue
    $("#step_name_email > .missingInfoMessage").show();
  }
});

// Step 2: Title and repro info
$("#step2-next").click(function(){
  var s2_problems = 0
  if ($title.val() === ""){
    s2_problems++;
    $title.addClass("inputError");    
  }
  if ($repro.val() === "1. \n2. \n3. "){
    s2_problems++;
    $repro.addClass("inputError");
  }
  if ($expect.val() === ""){
    s2_problems++;
    $expect.addClass("inputError");
  }
  if ($actual.val() === ""){
    s2_problems++;
    $actual.addClass("inputError");
  }
  if (s2_problems === 0){
    $(this).prop("disabled", true);
    $("#summary, #repro-steps, #expected-result, #actual-result").prop("disabled",true);
    $("#step_final_questions").fadeIn();
    $(".missingInfoMessage").hide();
    $(".inputError").removeClass("inputError");
    // Auto-scroll to bottom of the page
    $("html, body").animate({ scrollTop: 15000 }, 50);
  }
  else {
    // They made a mistake - let the user know
    s2_problems = 0
    $("#step_repro_info > .missingInfoMessage").show().css("display", "block");
  }
});

// Step 3: Final Questions
$("#submit").click(sendReport);