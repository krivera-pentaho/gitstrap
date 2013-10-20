define(['route', 'objects/references', 'objects/reference'], function(Route, References, Reference) {

	return function(showLoading, hideLoading, getCommits) {		

		var onBack = function() {
			route.router.enable("repository-view");
		}

		var onNext = function() {
			route.router.enable("commit-view");
		}

		var onLoad = function($el) {
			var references = new References($("#repository-references-container"));

			var $selectedRepository = $("#selected-repository .repository-object");
			var alias = $selectedRepository.attr("alias");
			var path = $selectedRepository.attr("path");
			
			// Retrieves references
			showLoading();
			$.get(getBaseUrl("/git/refs?path=") + path, function success(data){
				if (data.search("error:") > -1) {
					AlertBuilder.build(data.replace("error: ", ""), "ERROR", $("#alert-bar"));
					hideLoading();
					return;
				}

				var refs = data.split(",");

				$(refs).each(function(i, ref) {
					references.add(new Reference(ref, path, getCommits, showLoading, hideLoading));
				});

				hideLoading();
			});
		}

		var route = new Route("reference-route", "partials/references.html", onLoad, onNext, onBack);

		return route;
	}
});