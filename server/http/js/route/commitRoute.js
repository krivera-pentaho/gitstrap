define(['route', 'objects/commits', 'objects/commit'], function(Route, Commits, Commit) {

	return function(showLoading, hideLoading, handleHunks, clearHunks) {

		var onLoad = function() {
			var commits = new Commits($("#commit-objects"), $("#commit-history-container"));

			var $selectedRepository = $("#selected-repository .repository-object");		
			var path = $selectedRepository.attr("path");

			var $selectedBranch = $("#selected-branch .reference-object");
			var branch = $selectedBranch.attr("branch");

			function getFileDiff(sha1, sha2, fileName) {
				clearHunks();
				showLoading();

				$.get(getBaseUrl("/git/diff/file"+
					"?path=" + path + "&branch="+ branch +
					"&sha1=" + sha1+ "&sha2="+ sha2 +
					"&fileName=" + fileName), function success(data) {
					handleHunks(fileName, data);
				});
			}
			
			// Retrieve the commits for a given reference
			function getCommits(results) {
				
				showLoading();
				$.get(getBaseUrl("/git/commits?path=" + path + "&branch=" + branch + "&results=" + results), 
					function success(data) {						
						var commitHistory = eval("(" + data + ")");
						
						$(commitHistory).each(function(i, commitJson) {
							commits.add(new Commit(commitJson.commit, commitJson.date, 
								commitJson.author, commitJson.message, branch, path, 
								getFileDiff, clearHunks, showLoading, hideLoading));
						});

						// Create and add "load more buttons"
						$("#load-more").remove();
						$("<a class='btn active' href='#' id='load-more'>Load 10 More</a>")
							.bind("click",
								function(){
									$(this).remove();
									getCommits(results + 10);
								}	)
							.appendTo($("#commit-objects"));

						hideLoading();
					});
			}

			getCommits(10);
		}

		return new Route("commit-route", "partials/commits.html", onLoad);
	}
});