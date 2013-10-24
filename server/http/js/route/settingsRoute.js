define(['route'], function(Route) {

	return function(showLoading, hideLoading) {
		var onLoad = function($el) {

			// Load the settings
			showLoading();
			$.get("/cfg/all", function(cfgData) {

				for (key in cfgData) {
					$("#" + key).val(cfgData[key]);
				}

				hideLoading();				
			})

			// Onclick of the apply settings button
			$("#apply-btn").on("click", function() {
				showLoading();

				var cfgData = {};
				$el.find("INPUT").each(function(i, obj) {
					var $this = $(this);
					cfgData[$this.attr("id")] = escape($this.val());
				})

				$.post("cfg/many?properties=" + JSON.stringify(cfgData), function() {
					hideLoading();
				});
			});
		}

		return new Route("settings-route", "partials/settings.html", onLoad);
	}
});