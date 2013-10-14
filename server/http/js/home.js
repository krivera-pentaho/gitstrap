// Configure Require.js
require.config({
	paths: {
		"jquery": "lib/jquery/jquery-2.0.3.min",
		"jquery-ui": "lib/jquery/jquery-ui/js/jquery-ui-1.10.3.custom.min",
		"bootstrap": "lib/bootstrap/js/bootstrap.min",
		"bootstrap-contextmenu" : "lib/bootstrap/js/bootstrap-contextmenu",
		"handlebars": "lib/handlebars/handlebars",
		"backbone" : "lib/backbone/backbone-min",
		"underscore" : "lib/backbone/underscore-min"
	}
});

require(['jquery'], function() {
	require([
		'AlertBuilder',
		'underscore',
		'handlebars', 
		'jquery-ui', 
		'bootstrap', 
		'bootstrap-contextmenu',
		'backbone'], function(AlertBuilder) {

		// Backbone repository objects
		require([
			'objects/repositories', 
			'objects/repository', 
			'objects/references',
			'objects/reference',
			'objects/commits',
			'objects/commit',
			'objects/hunks',
			'objects/hunk',
			'objects/changes',
			'objects/change'], function(Repositories, Repository, References, Reference, Commits, Commit, Hunks, Hunk, Changes, Change) {	

			/*************** Backbone Object Interactions ***************/
			var repositories = new Repositories($("#repository-objects"), $("#repository-objects-container"), clear);
			var references = new References($("#repository-references-container"));
			var commits = new Commits($("#commit-objects"), $("#commit-history-container"));
			var hunks = new Hunks($("#file-diff-objects"), $("#file-diffs-container"))
			var changes = new Changes($("#staged-changes"), $("#unstaged-changes"), $("#untracked-changes"));
			
			function clearHunks() {
				hunks.clear();
			}

			function clearCommits() {
				hunks.clear();
				commits.clear();
			}

			function clear() {
				references.clear();
				commits.clear();
				hunks.clear();
			}

			function getChanges(path) {
				changes.clear();

				$.get("/git/status?path="+path, function success(data) {
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
								changeJson.status, "staged"));
							$("#stage-changes-next-btn").show();
						}
					});

					// Unstaged
					$(changesJson.not_staged).each(function(i, changeJson){
						changes.addUnstagedChange(new Change(path, changeJson.file, 
							changeJson.status, "unstaged"));
					});

					// Untracked
					$(changesJson.untracked).each(function(i, changeFile){
						changes.addUntrackedChange(new Change(path, changeFile, 
							"new file", "untracked"));
					});
				});
			}

			function getFileDiff(path, branch, sha1, sha2, fileName) {
				hunks.clear();
				showLoading();

				$.get(getBaseUrl("/git/diff/file"+
					"?path=" + path + "&branch="+ branch +
					"&sha1=" + sha1+ "&sha2="+ sha2 +
					"&fileName=" + fileName), function success(data) {
						hunks.model.set("fileName", fileName);

						var hunksObj = eval("(" + data + ")");

						$(hunksObj).each(function(i, lines){
							hunks.add(new Hunk(lines));
						});

						hideLoading();
				});
			}

			// Retrieve the commits for a given reference
			function getCommits(path, branch, results) {
				commits.clear();
				hunks.clear();
				
				showLoading();
				$.get(getBaseUrl("/git/commits?path=" + path + "&branch=" + branch + "&results=" + results), 
					function success(data) {						
						var commitHistory = eval("(" + data + ")");
						
						$(commitHistory).each(function(i, commitJson) {
							commits.add(new Commit(commitJson.commit, commitJson.date, 
								commitJson.author, commitJson.message, branch, path, getFileDiff, clearHunks, showLoading, hideLoading));
						});

						// Create and add "load more buttons"
						$("#load-more").remove();
						$("<a class='btn active' href='#' id='load-more'>Load 10 More</a>")
							.bind("click",
								function(){
									$(this).remove();
									getCommits(path, branch, results + 10);
								}	)
							.appendTo($("#commit-objects"));

						hideLoading();
					});
			}

			// Retrieves references
			function getReferences(alias, path) {
				references.clear();
				commits.clear();
				hunks.clear();

				showLoading();
				$.get(getBaseUrl("/git/refs?path=") + path, 
					function success(data){
						if (data.search("error:") > -1) {
							AlertBuilder.build(data.replace("error: ", ""), "ERROR", $("#alert-bar"));
							hideLoading();
							return;
						}

						var refs = data.split(",");

						$(refs).each(function(i, ref) {
							references.add(new Reference(ref, path, getCommits, clearCommits, showLoading, hideLoading));
						});

						hideLoading();
					});				
			}

			// Start loading of repositories
			showLoading();
			$.get(getBaseUrl("/cfg/single?property=repositories"),
				function success(data) {
					var reposJson = eval("(" + data + ")");	

					// Create repository objects
					$(reposJson).each(function(i, repoJson) {
						repositories.add(makeRepository(repoJson.path, repoJson.alias));
					});

					hideLoading();
					autoRefreshRepositories();					
				});

			function autoRefreshRepositories() {
				repositories.each(function(repoModel) {
					updateRepository(repoModel);
				});

				setTimeout(autoRefreshRepositories, 10000);
			}

			function updateRepository(repoModel) {
				if (loadingModalShowing) {
					return;
				}

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

						$.get(getBaseUrl("/git/status?path=" + repoModel.get("path")), 
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

			function makeRepository(path, alias) {
				return new Repository(path, alias, getReferences, getChanges, 
							showEditRepoModal, showRemoveRepoModal, showStageChangesModal, showLoading, hideLoading);
			}

			/***************** MODAL ACTIONS *****************/
			function repositoryAdd(alias, path, suppressAlert) {
				// Verify that the repository path is a valid git directory
				$.get(getBaseUrl("/git/isGitDir?path=" + path), 
					function(data) {

						if (data == "false") {
							AlertBuilder.build("'" + path + "' is not a valid path to a git repository", "ERROR", $("#alert-bar"));
							return;
						}
						
						// Get config
						$.get(getBaseUrl("/cfg/single?property=repositories"), 
							function success(data) {												
								var repos = eval("(" + data + ")");
								
								repos.push({
									"path": path,
									"alias": alias
								});						
								
								// Put new value in config
								$.post(getBaseUrl("/cfg/single?key=repositories&value=" + JSON.stringify(repos)), 
									function success() {
										
										$.get(getBaseUrl("/git/branch/current?path=" + path),
											function success(branch) {
												if (!suppressAlert) {
													AlertBuilder.build("Repository Added", "SUCCESS", $("#alert-bar"));	
												}												
												repositories.add(makeRepository(path, alias));
											});
									}).fail(function error() {
										AlertBuilder.build("An error occured writing the configuration", "ERROR", $("#alert-bar"));
									});
							}).fail(function error(){
								AlertBuilder.build("An error occured reading the configuration", "ERROR", $("#alert-bar"));
							});
					});
			}

			// Removes a repository object
			function repositoryRemove(alias, callback, suppressAlert) {

				// Get repositories from configuration
				$.get(getBaseUrl("/cfg/single?property=repositories"), 
					function success(data){
						var repos = eval("(" + data + ")");

						// Remove aliased repository
						for (var i = 0; i < repos.length; i++) {
							if (repos[i].alias == alias) {
								repos.splice(i,1);
								break;
							}
						}

						// Post the new value to the server
						$.post(getBaseUrl("/cfg/single?key=repositories&value=" + JSON.stringify(repos)), 
							function success(data) {

								if (!suppressAlert) {									
									AlertBuilder.build("Repository '" + alias + "' has been removed successfully", "SUCCESS", $("#alert-bar"));									
								}

								clear();
								repositories.remove(alias);

								if (callback) {
									callback();
								}
							}).fail(function error() {
								AlertBuilder.build("An error occured writing to configuration", "ERROR", $("#alert-bar"));
							});
					});
			}

			// Edit a repository in the configuration
			function repositoryEdit(origAlias, alias, path) {
				// First remove old repository information
				repositoryRemove(origAlias, function() {

					// Then add in the new one
					repositoryAdd(alias, path, true);
					clear();
				}, true);
			}

			// Bind edit repo interactions
			$("#edit-repo-path-btn").bind("click", function() {
				if (!verifyRepoInfoModal) {
					return;
				}
				$("#repo-info-modal").modal('hide');

				var origAlias = $(".repository-object.active").attr("alias");
				var alias = $("#repo-alias").val();
				var path = $("#repo-path").val();
				
				repositoryEdit(origAlias, alias, path);
			});

			// Bind click for add a repo path
			$("#add-repo-path-btn").bind("click", function() {
				if (!verifyRepoInfoModal) {
					return;
				}
				
				$("#repo-info-modal").modal('hide');

				var alias = $("#repo-alias").val();
				var path = $("#repo-path").val();
				repositoryAdd(alias, path);
			});

			$("#remove-repo-path-btn").bind("click", function() {
				repositoryRemove($(".repository-object.active").attr("alias"));
			});
		});

		// Init options on modal
		$("#repo-info-modal, #repo-remove-confirm-modal, #stage-changes-modal, #create-commit-modal").modal({
			keyboard: true,
			show: false
		});

		
		// Bind click interactions on add repo button
		$("#add-repo-btn").bind("click", showAddRepoModal);

		// Bind click for next in wizard for creating a commit
		$("#stage-changes-next-btn").bind("click", showCreateCommitModal);

		// Bind click to return back to staging files
		$("#create-commit-back-btn").bind("click", showStageChangesModal);

		// Bind submission button for creating a commit
		$("#create-commit-submit-btn").bind("click", submitCreateCommitRequest);

		// Verifies that the data in the repo info modal are valid
		function verifyRepoInfoModal() {
			var alias = $("#repo-alias").val();
			var path = $("#repo-path").val();

			if (alias == "" || path == "") {
				AlertBuilder.build("All values must be filled in", "WARN", $("#repo-info-modal .modal-body"));				
				return false;
			}

			return true;
		}

		function showAddRepoModal() {
			$("#repo-info-modal INPUT").val("");
			$("#repo-info-modal .edit").hide();
			$("#repo-info-modal .add").show();
			$("#repo-info-modal").modal('show');
		}
		
		function showEditRepoModal(alias, path) {
			$("#repo-info-modal #repo-alias").val(alias);
			$("#repo-info-modal #repo-path").val(path);

			$("#repo-info-modal .edit").show();
			$("#repo-info-modal .add").hide();
			$("#repo-info-modal").modal('show');
		}

		function showRemoveRepoModal() {
			$("#repo-remove-confirm-modal").modal("show");
		}

		function showStageChangesModal() {
			if ($("#staged-changes TR").length == 0) {
				$("#stage-changes-next-btn").hide();
			} else {
				$("#stage-changes-next-btn").show();
			}

			return $("#stage-changes-modal").modal("show");
		}

		function showCreateCommitModal() {
			$("#create-commit-modal")
				.modal("show")
				.find("INPUT, TEXTAREA")
					.val("")
					.text("");

			$.get(getBaseUrl("/git/refs?path=") + $(".repository-object.active").attr("path"),
				function(data) {
					$("#commit-branch-loading").remove();

					var refs = data.split(",");
					var localBranches = "refs/heads/";
					var optionTemplate = Handlebars.compile("<option>{{option}}</option>");
					$(refs).each(function(i, ref) {						
						if (ref.search(localBranches) > -1) {
							$("#commit-branch").append(
								optionTemplate({"option": ref.replace(localBranches, "")}));
						}
					});
				});
		}

		function submitCreateCommitRequest() {
			var commitMessage = $("#commit-message").val();
			if (commitMessage == "") {
				AlertBuilder.build("All input fields need to be completed.", "ERROR", $("#create-commit-modal .modal-body"));
				return;
			}

			// Commit Changes
			$.post(getBaseUrl("/git/commit"+
				"?path=" + $(".repository-object.active").attr("path") +
				"&branch=" + $("#commit-branch").val() +
				"&message=" + commitMessage), 
				function(data) {
					$("#create-commit-modal").modal("hide");

					if (data.search("error:") > -1) {
						AlertBuilder.build("Error committing changes", "ERROR", $("#alert-bar"));
					} else {
						AlertBuilder.build("Commit Successful", "SUCCESS", $("#alert-bar"));
					}
				});
		}

		var loadingModalShowing = false;
		function showLoading() {
			$("#loading-modal").modal({
				backdrop: "static"
			});

			loadingModalShowing = true;
		}

		function hideLoading() {
			loadingModalShowing = false;
			setTimeout(function(){
				$("#loading-modal").modal("hide");				
			}, 250);			
		}
	});
});

function getBaseUrl(additionalPath) {
	return "http://" + location.host + (additionalPath ? additionalPath : "");
}