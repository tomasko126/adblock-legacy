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
    url: "http://dev.getadblock.com/freshdesk/bugReport.php",
    data: {
			bug_report: JSON.stringify(report_data)
		},
    success: function(json){
      // TODO Add a success handler
    },
    error: function(xhrInfo, status, HTTPerror){
      // As backup, have them report the bug manually
      prepareManualReport(report_data, status, HTTPerror);
      $("#step_error").fadeIn();
      $("html, body").animate({ scrollTop: 15000 }, 50);  
		},
    type: "POST"
  });
}

// Preparation for manual report in case of error.
var prepareManualReport = function(data, status, HTTPerror){
  var body = [];
  body.push("This bug report failed to send. See bottom of debug info for details.");
  body.push("");
  body.push("* Repro Steps *");
  body.push(data.repro);
  body.push("");
  body.push("* Expected Result *");
  body.push(data.expect);
  body.push("");
  body.push("* Actual Result *");
  body.push(data.actual);
  body.push("");
  body.push("* Other comments *");
  body.push(data.comments);
  body.push("");
  
    // Get written debug info
      // data.debug is the debug info object
      content = [];
      content.push("=== Filter Lists ===");
      content.push(data.debug.filter_lists);
      content.push("");
      // Custom & Excluded filters might not always be in the object
      if (data.debug.custom_filters){
        content.push("=== Custom Filters ===");
        content.push(data.debug.custom_filters);
        content.push("")
      }
      if (data.debug.exclude_filters){
        content.push("=== Exclude Filters ===");
        content.push(data.debug.exclude_filters);
        content.push("");
      }
      content.push("=== Settings ===");
      content.push(data.debug.settings);
      content.push("");
      content.push("=== Other Info ===");
      content.push(data.debug.other_info);
      // Put it together to put into the textbox
      var text_debug_info = content.join("\n");
  
  body.push("");
  body.push("");
  body.push("===== Debug Info =====");
  body.push(text_debug_info);
  body.push("=== API ERROR DETAILS ===");
  body.push("jQuery error: " + status);
  body.push("HTTP Error code: " + HTTPerror);

  $("#manual_submission").val(body.join("\n"));
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