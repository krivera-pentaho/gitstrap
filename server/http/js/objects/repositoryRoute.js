define(['route', 
	'objects/repositories', 
	'objects/repository', 
	'objects/changes', 
	'objects/change'], function(Route, Repositories, Repository, Changes, Change) {	

	return function(showLoading, hideLoading, showAddRepoModal, showEditRepoModal, showRemoveRepoModal, 
		showStageChangesModal, hideStageChangesModal, handleHunks, clearHunks) {		

		var repositories = null;
		var addRepository = function (path, alias) {			
			var repository = new Repository(path, alias, getChanges,
				showEditRepoModal, showRemoveRepoModal, showStageChangesModal, showLoading, hideLoading, onNext);
			repositories.add(repository);

			updateRepository(repository.model);
		}; 

		var removeRepository = function(alias) {
			repositories.remove(alias);
		}

		var onNext = function() {
			route.router.enable("reference-route");
		}

		var onLoad = function($el) {
			repositories = new Repositories($("#repository-objects"), $("#repository-objects-container"));

			// Remove any repositories that were previously selected
			$("#selected-repository").empty();

			// Remove any branches that were previously selected
			$("#selected-branch").empty();

			// Bind click interactions on add repo button
			$("#add-repo-btn").bind("click", showAddRepoModal);

			// Start loading of repositories
			showLoading();
			$.get("/cfg/single?property=repositories",
				function success(data) {
					var reposJson = eval("(" + data + ")");	

					// Create repository objects
					$(reposJson).each(function(i, repoJson) {
						addRepository(repoJson.path, repoJson.alias);
					});

					hideLoading();
					// autoRefreshRepositories();					
				});
			
			function autoRefreshRepositories() {
				repositories.each(function(repoModel) {
					updateRepository(repoModel);
				});

				setTimeout(autoRefreshRepositories, 10000);
			}			
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

							repoModel.set("status", state);
						});						

					// Get currently checked out branch
					$.get("/git/branch/current?path=" + repoModel.get("path"),
						function success(branch) {
							repoModel.set("branch", branch);									
						});
				});				
		}

		var changes = new Changes($("#staged-changes"), $("#unstaged-changes"), $("#untracked-changes"));
		function getChanges(path) {
			changes.clear();

			$.get("/git/status?path=" + path, function success(data) {
				var changesJson = eval("(" + data + ")");

				// Staged
				$(changesJson.staged).each(function(i, changeJson) {

					var add = true;
					$(changesJson.not_staged).each(function(i, unstagedChangeJson) {
						if (changeJson.file == unstagedChangeJson.file) {
							add = false;
						}
					});

					if (add) {
						changes.addStagedChange(new Change(path, changeJson.file, 
							changeJson.status, "staged", handleHunks, showStageChangesModal, hideStageChangesModal, clearHunks));
						$("#stage-changes-next-btn").show();
					}
				});

				// Unstaged
				$(changesJson.not_staged).each(function(i, changeJson){
					changes.addUnstagedChange(new Change(path, changeJson.file, 
						changeJson.status, "unstaged", handleHunks, showStageChangesModal, hideStageChangesModal, clearHunks));
				});

				// Untracked
				$(changesJson.untracked).each(function(i, changeFile){
					changes.addUntrackedChange(new Change(path, changeFile, 
						"new file", "untracked", handleHunks, showStageChangesModal, hideStageChangesModal, clearHunks));
				});
			});
		}

		var route = new Route("repository-route", "partials/repositories.html", onLoad, onNext);
		route.addRepository = addRepository;
		route.removeRepository = removeRepository;

		return route;
	}
})