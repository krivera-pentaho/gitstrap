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
	console.log(path  + " " + branch);
	git.checkout(path, branch, function(){
		callback();
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