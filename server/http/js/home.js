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

require(['jquery', 'underscore'], function() {
	require([
		'AlertBuilder',
		'handlebars', 
		'jquery-ui', 
		'bootstrap', 
		'bootstrap-contextmenu',
		'backbone'], function(AlertBuilder) {

		// Create Routes
		var addRepository = null;
		var removeRepository = null;
		require([
			'router', 
			'route/repositoryRoute', 
			'route/referenceRoute',
			'route/commitRoute',
			'route/settingsRoute'], function(Router, RepositoryRoute, ReferenceRoute, CommitRoute, SettingsRoute) {
				var history = [];

				var router = new Router($("#view-panel"), 
					function preActivate(preRouteId, routeId) {						
						history.push(preRouteId);
					});
				
				var repositoryRoute = new RepositoryRoute(showLoading, hideLoading, 
					showAddRepoModal, showEditRepoModal, showRemoveRepoModal,
					showStageChangesModal, hideStageChangesModal,
					handleHunks, clearHunks);				
				addRepository = repositoryRoute.addRepository;
				removeRepository = repositoryRoute.removeRepository;

				// Repository Route
				router.addRoute(repositoryRoute);

				// Reference Route
				router.addRoute(new ReferenceRoute(showLoading, hideLoading));

				// Commits Route
				router.addRoute(new CommitRoute(showLoading, hideLoading, handleHunks, clearHunks));

				//Settings Route
				router.addRoute(new SettingsRoute(showLoading, hideLoading));

				router.enable("repository-route");

				$("#home-nav").on("click", function() {
					router.enable("repository-route", true);
					history = [];						
				})

				$("#back-nav").on("click", function() {
					var routeId = history.pop();

					if (routeId) {
						router.enable(routeId, true);	
					}					
				});

				$("#settings-nav").on("click", function() {
					router.enable("settings-route");
				});
			});

		// Require Hunk Objects objects
		var handleHunks, clearHunks;
		require(['objects/hunks','objects/hunk'], function(Hunks, Hunk) {

			/*************** Backbone Object Interactions ***************/
			var hunks = new Hunks($("#file-diff-objects"), $("#file-diffs-container"));
			
			clearHunks = function() {
				hunks.clear();
				$("#file-diffs-container").modal("hide");
			}

			handleHunks = function(fileName, httpResponse) {
				hunks.model.set("fileName", fileName);
				var hunksObj = eval("(" + httpResponse + ")");

				$(hunksObj).each(function(i, lines){
					hunks.add(new Hunk(lines));
				});
				
				var container = $("#file-diffs-container");						
				
				container
					.modal("show")
					.css("width", "95%")
					.css("height", "95%")
					.offset({ 
						left : ($(window).width() - container.width()) / 2,
						top : (window.innerHeight - container.height()) / 2 + $(window).scrollTop() 
					})
					.find(".modal-body").css({
						"max-height" : "none",
						"height" : "88%"
					});

				hideLoading();

				return container;
			}			
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
					$.get("/cfg/single?property=repositories", 
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
											addRepository(path, alias);
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
							
							removeRepository(alias);

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

		// Init options on modal
		$("#repo-info-modal, #repo-remove-confirm-modal, #stage-changes-modal, #create-commit-modal, #file-diffs-container").modal({
			keyboard: true,
			show: false
		});

		// Bind click for next in wizard for creating a commit
		$("#stage-changes-next-btn").bind("click", showCreateCommitModal);

		// Bind click to return back to staging files
		$("#create-commit-back-btn").bind("click", showStageChangesModal);

		// Bind submission button for creating a commit
		$("#create-commit-submit-btn").bind("click", submitCreateCommitRequest);

		$("#stage-changes-modal .btn").on("click", function() {
			$(this).next().find(".change-object").each(function(i, obj) {
				$(obj).trigger("click");
			});
		});
		//

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

		function hideStageChangesModal() {
			return $("#stage-changes-modal").modal("hide");
		}

		function showCreateCommitModal() {
			$("#create-commit-modal")
				.modal("show")
				.find("INPUT, TEXTAREA")
					.val("")
					.text("");

			$.get("/git/refs?path=" + $(".repository-object.active").attr("path"),
				function(data) {
					$("#commit-branch-loading").remove();

					var refs = data.split(",");
					var localBranches = "refs/heads/";
					var optionTemplate = Handlebars.compile("<option>{{option}}</option>");

					$("#commit-branch").empty();
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

			while (commitMessage.search("\"") > -1) {
				commitMessage = commitMessage.replace("\"", "");
			}

			while (commitMessage.search("\'") > -1) {
				commitMessage = commitMessage.replace("\'", "");
			}

			// Commit Changes
			$.post("/git/commit"+
				"?path=" + $(".repository-object.active").attr("path") +
				"&branch=" + $("#commit-branch").val() +
				"&message=" + commitMessage, 
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