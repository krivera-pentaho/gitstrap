define(['handlebars'], function() {
	
	var alertTemplate = Handlebars.compile(
		"<div class='alert-container' class='hide'>" +
			"{{#if doNotAutoRemove}}"+
				"<button type='button' class='close' data-dismiss='alert'>&times;</button>" +
			"{{/if}}"+
		  	"<div class='alert-message'>{{message}}</div>" +
		"</div>");

	var ALERT_SEVERITY = {
		"WARN": "",
		"INFO": "alert-info",
		"SUCCESS": "alert-success",
		"ERROR": "alert-error"
	};

	return {
		build: function(message, severity, $appendTo, doNotAutoRemove) {
			var $alert = $(alertTemplate({
					message: message,
					doNotAutoRemove: doNotAutoRemove
				}))
				.addClass("alert")
				.addClass(ALERT_SEVERITY[severity])		
				.alert();

			// Remove alert after 
			if (!doNotAutoRemove) {
				setTimeout(function(){
					$alert.fadeOut(250, function(){
						$alert.remove();
					})
				}, 5000);
			}

			if ($appendTo) {
				$alert.appendTo($appendTo);
			}

			return $alert;
		}	
	};
});