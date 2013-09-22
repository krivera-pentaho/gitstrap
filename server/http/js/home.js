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
		'handlebars', 
		'jquery-ui', 
		'bootstrap', 
		'bootstrap-contextmenu',
		'underscore',
		'backbone'], function(AlertBuilder) {

		// Backbone repository objects
		require([
			'objects/repositories', 
			'objects/repository', 
			'objects/references',
			'objects/reference',
			'objects/commits',
			'objects/commit'], function(Repositories, Repository, References, Reference, Commits, Commit) {	

			/*************** Backbone Object Interactions ***************/
			var repositories = new Repositories($("#repository-objects"), $("#repository-objects-container"));
			var references = new References($("#repository-references-container"));
			var commits = new Commits($("#commit-objects"), $("#commit-history-container"));

			// Retrieve the commits for a given reference
			function getCommits(path, branch, results) {
				commits.clear();				
				var progress = $(progressTemplate);

				$("#commit-objects").append(progress);
				$("#commit-history-container").show();
			
				$.get(getBaseUrl("/git/commits?path=" + path + "&branch=" + branch + "&results=" + results), 
					function success(data){
						progress.remove();					
						var commitHistory = eval("(" + data + ")");
						
						$(commitHistory).each(function(i, commitJson) {
							commits.add(new Commit(commitJson.commit, commitJson.date, commitJson.author, commitJson.message, branch, path));
						});

						// Create and add "load more buttons"
						$("<a class='btn active' href='#'>Load 10 More</a>")
							.bind("click",
								function(){
									$(this).remove();
									getCommits(path, branch, results + 10);
								}	)
							.appendTo($("#commit-objects"));
					});
			}

			// Retrieves references
			function getReferences(alias, path) {
				references.clear();
				commits.clear();

				$.get(getBaseUrl("/git/refs?path=") + path, 
					function success(data){
						var refs = data.split(",");

						$(refs).each(function(i, ref) {
							references.add(new Reference(ref, path, getCommits));
						});
					});				
			}

			// Start loading of repositories
			$.get(getBaseUrl("/cfg/single?property=repositories"),
				function success(data) {
					var reposJson = eval("(" + data + ")");	

					// Create repository objects
					$(reposJson).each(function(i, repoJson) {

						// Get currently checked out branch
						$.get(getBaseUrl("/git/branch/current?path=" + repoJson.path),
							function success(branch) {
								repositories.add(new Repository(repoJson.path, repoJson.alias, 
									branch, getReferences, showEditRepoModal, showRemoveRepoModal));
							});
					})
				});

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
												repositories.add(new Repository(path, alias, branch, 
													getReferences, showEditRepoModal, showRemoveRepoModal));
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
		$("#repo-info-modal, #repo-remove-confirm-modal").modal({
			keyboard: true,
			show: false
		});

		
		// Bind click interactions on add repo button
		$("#add-repo-btn").bind("click", showAddRepoModal);

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
		
		var progressTemplate = "<div class='active progress progress-striped'>"+
									"<div class='bar' style='width: 100%;''></div>"+
								"</div>";

		// $.get(getBaseUrl("/git/diffs?path=/home/krivera/git/pentaho-platform/&sha=a0159cb3b47e1343ea0c43f81569534f569ad99d"), function success(data){
		// });
	});
});

function getBaseUrl(additionalPath) {
	return "http://" + location.host + (additionalPath ? additionalPath : "");
}