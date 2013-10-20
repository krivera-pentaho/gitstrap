define(['route', 'objects/repositories', 'objects/repository'], function(Route, Repositories, Repository) {	

	return function(showLoading, hideLoading, getChanges, showEditRepoModal, showRemoveRepoModal, showStageChangesModal) {

		var onNext = function() {
			route.router.enable("reference-route");
		}

		var onLoad = function($el) {
			var repositories = new Repositories($("#repository-objects"), $("#repository-objects-container"));

			// Start loading of repositories
			showLoading();
			$.get("/cfg/single?property=repositories",
				function success(data) {
					var reposJson = eval("(" + data + ")");	

					// Create repository objects
					$(reposJson).each(function(i, repoJson) {
						repositories.add(makeRepository(repoJson.path, repoJson.alias));
					});

					hideLoading();
					autoRefreshRepositories();					
				});

			function makeRepository(path, alias) {
				return new Repository(path, alias, getChanges, 
					showEditRepoModal, showRemoveRepoModal, showStageChangesModal, showLoading, hideLoading, onNext);
			}

			function autoRefreshRepositories() {
				repositories.each(function(repoModel) {
					updateRepository(repoModel);
				});

				// setTimeout(autoRefreshRepositories, 10000);
			}

			function updateRepository(repoModel) {
				// if (loadingModalShowing) {
				// 	return;
				// }

				// Verify path still exists and is valid
				$.get(getBaseUrl("/git/isGitDir?path=" + repoModel.get("path")), 
					function success(data) {
						if (data == "false") {
							repoModel.set({
								"branch": "ERROR", 
								"status": "ERROR"
							});
							return;
						}

						$.get("/git/status?path=" + repoModel.get("path"), 
							function success(statusStr) {
								var status = eval("(" + statusStr + ")");

								var state = "Unmodified";
								for (key in status) {
									if (status[key].length > 0) {
										state = "Modified";

										if (key == 'conflict') {
											state = "Conflict";
											break;
										}
									}
								}								

								// Get currently checked out branch
								$.get(getBaseUrl("/git/branch/current?path=" + repoModel.get("path")),
									function success(branch) {
										repoModel.set({
											"branch": branch, 
											"status": state
										});
									});
							});						
					});				
			}
		}

		var route = new Route("repository-view", "partials/repositories.html", onLoad, onNext);
		return route;
	}
})