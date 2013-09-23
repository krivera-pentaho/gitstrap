var fs = require("fs");
var git = require("./git");
var path = require("path");
// var sort = git.RevWalk.Sort;

// Determines if the provided directory is a cloned git repository
var isGitDir = exports.isGitDir = function(path) {	
	var dirContents = fs.readdirSync(path);
	return dirContents.indexOf(".git") > -1;
}

var updateFromUpstream = exports.updateFromUpstream = function(path) {

}

var getCurrentBranch = exports.getCurrentBranch = function(path, callback) {
	git.tree(path, function(tree) {
		callback(tree.current);
	});
}

var getReferences = exports.getReferences = function(path, callback) {
	git.references(path, function(references){
		callback(references.toString());
	});
}

var getCommits = exports.getCommits = function(path, branch, results, callback) {
	_switchAndMaintainBranch(branch, function(checkoutCallback) {
		git.history(path, results, function(history) {
			checkoutCallback(function() {
				callback(JSON.stringify(history));		
			});
		});		
	});	
}

var getDiffNames = exports.getDiffNames = function(path, branch, sha1, sha2, callback) {
	_switchAndMaintainBranch(branch, function(checkoutCallback) {
		git.diffNames(path, sha1, sha2, function(diffNames) {
			checkoutCallback(function() {
				callback(JSON.stringify(diffNames));
			});
		});
	});	
}

var checkoutBranch = exports.checkoutBranch = function(path, branch, callback) {
	git.checkout(path, branch, function(){
		callback();
	});
}

var getDiffFile = exports.getDiffFile = function(path, branch, sha1, sha2, fileName, callback) {
	_switchAndMaintainBranch(branch, function(checkoutCallback) {
		git.diff(path, sha1, sha2, function(fileDiffs) {

			var fileFound = false;
			var hunks = [];	
			var hunk = [];
			var start = false;	

			fileDiffs.forEach(function(val, key) {
				
				if (val.search("diff --git") > -1) {					
					fileFound = val.search(fileName) > -1;
				}
				
				if (fileFound) {
					
					if (val.search("@@") > -1) {
						
						if (hunk.length > 0) {
							hunks.push(hunk);
						}
						start = true;
						hunk = [];
						hunk.push(["", val]);
						return;
					}				

					if (!start) {
						return;
					}

					hunk.push([val.substr(0,1), val.substr(1)]);

					if (key == fileDiffs.length - 1) {
						hunks.push(hunk);
					}

				} else if (hunk.length > 0 ) {
					hunks.push(hunk);
					hunk = [];
				}				
			});

			checkoutCallback(function() {
				callback(JSON.stringify(hunks));
			});
		});
	});	
}

function _switchAndMaintainBranch(branch, action) {
	
	// Get current branch
	getCurrentBranch(path, function(currentBranch) {

		// Checkout the branch we want to see the history of
		git.checkout(path, branch, function() {

			// Perform the action after switching branches
			action(function(callback) {

				// Re-checkout branch
				git.checkout(path, currentBranch, callback);
			});		
		});	
	});
}