// Configure Require.js
require.config({
	baseUrl:"js/lib",
	paths: {
		"jquery": "jquery/jquery-2.0.3.min",
		"jquery-ui": "jquery/jquery-ui/js/jquery-ui-1.10.3.custom.min",
		"bootstrap": "bootstrap/js",
		"handlebars": "handlebars/handlebars"
	}
});

require(['jquery'], function() {
	require(['handlebars', 'jquery-ui', 'bootstrap/bootstrap.min', 'bootstrap/bootstrap-contextmenu'], function() {

		// $.get(getBaseUrl("/git/diffs?path=/home/krivera/git/pentaho-platform/&sha=a0159cb3b47e1343ea0c43f81569534f569ad99d"), function success(data){
		// });

		// Navigate Home
		$("#home-nav").bind("click", function(){
			updateRepositoryObjects();
		});

		// Init options on modal
		$("#repo-info-modal, #repo-remove-confirm-modal").modal({
			keyboard: true,
			show: false
		});

		$("#remove-repo-path-btn").bind("click", function() {
			repositoryRemove($(".repository-object.active").attr("alias"));
		});

		// Bind click interactions on add repo button
		$("#add-repo-btn").bind("click", showAddRepoModal);

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

		// Verifies that the data in the repo info modal are valid
		function verifyRepoInfoModal() {
			var alias = $("#repo-alias").val();
			var path = $("#repo-path").val();

			if (alias == "" || path == "") {
				var alert = buildAlert("All values must be filled in", "WARN");
				$("#alert-bar").append(alert);
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

		function repositoryAdd(alias, path) {
			// Verify that the repository path is a valid git directory
			$.get(getBaseUrl("/git/isGitDir?path=" + path), 
				function(data) {

					var alert;
					var $appendAlertTo = $("#body #content");
					if (data == "false") {
						buildAlert("'" + path + "' is not a valid path to a git repository", "ERROR").appendTo($appendAlertTo);
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
									buildAlert("Repository Added", "SUCCESS").appendTo($appendAlertTo);
									updateRepositoryObjects();
								}).fail(function error() {
									buildAlert("An error occured writing the configuration", "ERROR").appendTo($appendAlertTo);
								});
						}).fail(function error(){
							buildAlert("An error occured reading the configuration", "ERROR").appendTo($appendAlertTo);
						});
				});
		}

		function repositoryRemoveDialog() {
			$("#repo-remove-confirm-modal").modal("show")
		}

		// Removes a repository object
		function repositoryRemove(alias, callback, suppressAlert) {

			// Get repositories from configuration
			$.get(getBaseUrl("/cfg/single?property=repositories"), 
				function success(data){
					var repositories = eval("(" + data + ")");

					// Remove aliased repository
					for (var i = 0; i < repositories.length; i++) {
						if (repositories[i].alias == alias) {
							repositories.splice(i,1);
							break;
						}
					}

					// Post the new value to the server
					$.post(getBaseUrl("/cfg/single?key=repositories&value=" + JSON.stringify(repositories)), 
						function success(data) {

							if (!suppressAlert) {
								updateRepositoryObjects();
								buildAlert("Repository '" + alias + "' has been removed successfully", "SUCCESS").appendTo($("#alert-bar"));
							}

							if (callback) {
								callback();
							}
						}).fail(function error() {
							buildAlert("An error occured writing to configuration", "ERROR").appendTo($("#alert-bar"));
						});
				});
		}

		// Edit a repository in the configuration
		function repositoryEdit(origAlias, alias, path) {
			// First remove old repository information
			repositoryRemove(origAlias, function() {

				// Then add in the new one
				repositoryAdd(alias, path);
			}, true);
		}

		// Updates the view for the repository objects
		var updateRepositoryObjects = function () {
			var $repositoryObjects = $("#repository-objects");

			$repositoryObjects.empty();
			$("#repository-references-container").hide();
			$("#commit-history-container").hide();

			// Add repository objects to main screen
			$.get(getBaseUrl("/cfg/single?property=repositories"), 
				function success(data) {
					var repos = eval("(" + data + ")");	

					var $repositoryObjectsContainer = $("#repository-objects-container");
					if (repos.length > 0) {
						$repositoryObjectsContainer.show();
					} else {
						$repositoryObjectsContainer.hide()
					}			
			
					$(repos).each(function(i, repo) {

						// Get currently checked out branch
						$.get(getBaseUrl("/git/branch/current?path=" + repo.path),
							function success(branch){
								var $repoObj = $(repositoryObjectTemplate({
									"branch" : branch,
									"title": repo.alias,
									"path": repo.path
								}));

								$repoObj
									.attr("alias", repo.alias)
									.attr("path", repo.path)
									.droppable({
										accept: function(draggable){											
											return repo.path == draggable.attr("path") && 
												draggable.attr("reference") != branch && 
												draggable.hasClass("reference-object");
										},
      									hoverClass: "ui-state-highlight",
      									drop: function(event, ui) { 
      										var droppedBranch = ui.helper.attr("reference");

      										// Checkout branch on drop
      										$.post(getBaseUrl("/git/branch/checkout" +
      											"?path=" + repo.path +
      											"&branch=" + droppedBranch), 
      											function success() {
	      											updateRepositoryObjects();
	      											$("#alert-bar").append(buildAlert("Switched " + 
	      												repo.alias + " to " + droppedBranch, "SUCCESS"));
	      										});
      									}
									});

								$repositoryObjects.append($repoObj);

								// Bind click for repo objects
								$repoObj.bind("click contextmenu", function() {
									var $this = $(this);

									if ($this.hasClass("active")) {
										return;
									}

									$(".repository-object").removeClass("active");
									$this.addClass("active");

									updateReferences($this.attr("alias"), $this.attr("path"));
									$("#commit-history-container").hide();
								});

								// Add ContextMenu controls
								$repoObj.contextmenu({
									onItem: function(e, item) {
										var $activeRepo = $(".repository-object.active");
										var alias = $activeRepo.attr("alias");
										var path = $activeRepo.attr("path")
										var id = $(item).attr("id");

										switch (id) {
											case "remove-repo-context": repositoryRemoveDialog(); break;
											case "edit-repo-context": showEditRepoModal(alias, path); break;
											case "update-repo-context": break;
										}
									}
								});
							});						
					});
				});
		};
		updateRepositoryObjects();

		// Updates references for a selected reference
		function updateReferences(alias, path) {
			$(".git-references").empty();
			$("#repository-references-container").show();

			$.get(getBaseUrl("/git/refs?path=") + path, 
				function success(data){
					var refs = data.split(",");

					var $localRefs = $("#local-references");
					var localRef = "refs/heads/";

					var $remoteRefs = $("#remote-references");
					var remoteRef = "refs/remotes/"

					var $tagRefs = $("#tag-references");
					var tagRef = "refs/tags/"				

					$(refs).each(function(i, ref){
						var appendTo;
						var title = ref;
						var isLocalRef = false;

						if (ref.search(localRef) != -1) {
							isLocalRef = true;
							appendTo = $localRefs;
							title = title.replace(localRef, "");
						} else if (ref.search(remoteRef) != -1) {
							appendTo = $remoteRefs;
							title = title.replace(remoteRef, "");
						} else if (ref.search(tagRef) != -1) {
							appendTo = $tagRefs;
							title = title.replace(tagRef, "");
						} else {
							return;
						}

						var referenceObject = $(referenceObjectTemplate({
							title: title,
							isLocalReference: isLocalRef
						})).attr("reference", title).attr("path", path);

						if (isLocalRef) {
							referenceObject
								.bind("click contextmenu", function() {
									$this = $(this);
									$this.siblings().removeClass("active");
									$this.addClass("active");
									
									var branch = $this.find(".title").attr("title");
									updateCommits(path, branch, 10);
								})
								
								.draggable({ revert : true 	})
								.addClass("local-reference-object");	
						}
						
						appendTo.append(referenceObject);
					});
				});
		}

		function updateCommits(path, branch, results) {
			var progress = $(progressTemplate);

			$("#commit-objects").empty().append(progress);
			$("#commit-history-container").show();
			
			$.get(getBaseUrl("/git/commits?path=" + path + "&branch=" + branch + "&results=" + results), 
				function success(data){
					progress.remove();					
					var commits = eval("(" + data + ")");
					
					$(commits).each(function(i, commit) {
						
						var commitObject = $(commitObjectTemplate({
							title: commit.commit,
							date: commit.date,
							author: commit.author,
							message: commit.message
						}))
						.attr("commit", commit.commit)
						.bind("click", function(){
							$this = $(this);
							$this.siblings().removeClass("active");
							$this.addClass("active");
								
							$.get(getBaseUrl("/git/diffs?path=" + path + 
									"&branch=" + branch + 
									"&sha1=" + $this.attr("commit") +
									"&sha2=" + $this.next().attr("commit")), 
								function success(data){
									$(".diff-names-object").remove();
									var diffNames = eval("(" + data + ")");

									var diffNamesObject = $(diffNamesObjectTemplate({}));

									for (var i = 0; i < diffNames.length; i++) {
										var diffName = diffNames[i];
										var modification;

										switch(diffName[0]) {
											case "M" : modification = "warning"; break;
											case "D" : modification = "error"; break;
											case "A" : modification = "success"; break;
										}

										var diffNameObject = $(diffNameObjectTemplate({
											modification: modification,
											file: diffName[1]
										}));
										diffNamesObject.append(diffNameObject);
									}

									$this.append(diffNamesObject);
							 	});

						});

						$("#commit-objects").append(commitObject);
					});

					$("#commit-objects").append(
						$(loadMoreCommitsBtn).bind("click",
							function(){
								updateCommits(path, branch, results + 10);
							}));
				})
		}
		
		
		// Define global variable after handlebars has been required
		alertTemplate = Handlebars.compile(
			"<div class='alert-container' class='hide'>" +
				"{{#if doNotAutoRemove}}"+
					"<button type='button' class='close' data-dismiss='alert'>&times;</button>" +
				"{{/if}}"+
			  	"<div class='alert-message'>{{message}}</div>" +
			"</div>");

		var repositoryObjectTemplate = Handlebars.compile(
			"<div class='git-object repository-object img-rounded' data-toggle='context' data-target='#repository-object-context-menu'>"+
				"<div class='title text-center'>{{title}}</div>"+
				"<div class='content'>"+
					"<div><strong>Branch:</strong> {{branch}}</div>"+
					"<div title='{{path}}'><strong>Path:</strong> {{path}}</div>"+
					"{{content}}"+
				"</div>"+
			"</div>");

		var referenceObjectTemplate = Handlebars.compile(
			"<div class='git-object reference-object img-rounded' {{#if isLocalReference}} data-toggle='context' data-target='#reference-object-context-menu' {{/if}}>" +
				"<div class='title text-center' title='{{title}}'>{{title}}</div>"+
				"<div class='content'>"+					
				"</div>" +
			"</div>");

		var commitObjectTemplate = Handlebars.compile(
			"<div class='git-object commit-object img-rounded'>"+
				"<div class='title text-center' title='{{title}}'>{{title}}</div>"+
				"<div class='content text-left'>"+
					"<div><strong>Author: </strong> {{author}}</div>"+
					"<div><strong>Date: </strong> {{date}}</div>"+
					"<div><strong>Message: </strong> {{message}}</div>"+
				"</div>"+
			"</div>");

		var progressTemplate = "<div class='active progress progress-striped'>"+
									"<div class='bar' style='width: 100%;''></div>"+
								"</div>";

		var loadMoreCommitsBtn = "<a class='btn active' href='#'>Load 10 More</a>";

		var diffNamesObjectTemplate = Handlebars.compile(
			"<table class='table table-hover table-striped table-bordered table-condensed diff-names-object'>" +
			"</table>");

		var diffNameObjectTemplate = Handlebars.compile(
			"<tr class='{{modification}}'>" +
				"<td class='diff-name-object'>{{file}}</td>" +
			"</tr>")
	});
});

var ALERT_SEVERITY = {
	"WARN": "",
	"INFO": "alert-info",
	"SUCCESS": "alert-success",
	"ERROR": "alert-error"
}

var alertTemplate;
function buildAlert(message, severity, doNotAutoRemove) {
	var $alert = $(alertTemplate({
		message: message,
		doNotAutoRemove: doNotAutoRemove
	}));

	// Remove alert after 
	if (!doNotAutoRemove) {
		setTimeout(function(){
			$alert.fadeOut(250, function(){
				$alert.remove();
			})
		}, 5000);
	}

	return $alert		
		.addClass("alert")
		.addClass(ALERT_SEVERITY[severity])		
		.alert();
}	

function getBaseUrl(additionalPath) {
	return "http://" + location.host + (additionalPath ? additionalPath : "");
}

