var fs = require("fs");
var git = require("../../");
var path = require("path");
var sort = git.RevWalk.Sort;

// Determines if the provided directory is a cloned git repository
var isGitDir = exports.isGitDir = function(path) {	
	var dirContents = fs.readdirSync(path);
	return dirContents.indexOf(".git") > -1;
}

var updateFromUpstream = exports.updateFromUpstream = function(path) {

}

var getCurrentBranch = exports.getCurrentBranch = function(gitPath, callback) {
	git.Repo.open(path.resolve(gitPath, '.git'), function(error, repo) {
		if (error) throw error;	  
		
		var refs = repo.getReferences(1, function(error, references) {
			if (error) throw error;	  
			console.log(references);
		});		
	});
}

var getReferences = exports.getReferences = function(gitPath, callback) {
	git.Repo.open(path.resolve(gitPath, '.git'), function(err, repo) {
		if (err) throw err;

		repo.getReferences(1, function(error, references) {
			if (error) throw error;	  

			// for (var i = 0; i < references.length; i++) {

			// 	repo.getReference(references[i], function(err, reference){
			// 		console.log(reference.target());	
			// 	})
				
			// }
			
			callback(references.toString());
		});		
	})
}

var getCommits = exports.getCommits = function(gitPath, gitBranch, results, callback) {
	git.Repo.open(path.resolve(gitPath, '.git'), function(err, repo) {
		if (err) throw err;
		
		repo.getBranch(gitBranch, function(err, branch) {

			var history = branch.history(sort.Time);

			var stop = 0;
			var commits = [];
			var madeCallback = false;
			 // History emits 'commit' event for each commit in the branch's history
		    history.on('commit', function(commit) {
		    	// Stop after so many results
		    	if (stop++ > results) {

		    		if (!madeCallback){
		    			callback(JSON.stringify(commits));
		    			madeCallback = true;
		    		}
					
					return;
				}			

		    	var commitJson = {};
				commitJson['sha'] = 	commit.sha();
				commitJson['author'] = 	commit.author().name() + ' <' + commit.author().email() + '>';
				commitJson['date'] = 	commit.date();
				commitJson['message'] = commit.message();
				commits.push(commitJson);

				// commit.getTree(function(err, tree){
				// 	tree.walk().on('entry', function(entry){
				// 		if (entry.isFile()) {

				// 			entry.getBlob(function(err, blob){
				// 				// console.log(entry.path());
								
				// 			})							
				// 		}
						
				// 	}).start();
				// });



				
		    }).start();
		});
	});
}

var getDiffs = exports.getDiffs = function(gitPath, gitBranch, sha, callback) {
	git.Repo.open(path.resolve(gitPath, '.git'), function(err, repo) {
		if (err) throw err;	
		
		repo.getBranch(gitBranch, function(err, branch) {
			var history = branch.history(sort.Time);		

		    history.on('commit', function(commit) {				
		    	if (commit.sha() == sha) {
		    		commit.getDiff(function(err, diffList){
		    			diffList.forEach(function(diff){
		    				 diff.patches().forEach(function(patch) {
						          console.log("diff", patch.oldFile().path(), patch.newFile().path());
						      });
		    			})
		    		})
		    		// commit.getTree(function(err, tree){

	    			// var count = 0;
	    			// commit.history(sort.Time)
	    			// 	.on('commit', function(commit) {

	    			// 		if (count == 1) {
		    		// 			commit.getTree(function(err, compareTree){
		    		// 				tree.diff(compareTree, function(err, diffList){
		    							
		    		// 					diffList.patches()
		    		// 				});
		    		// 			})			    					
	    			// 		}

	    			// 		count++;
		    				
		    		// 	}).start();
		    		// });		    		
		    	}				
		    }).start();			
		});

		// commit.getDiff(function(error, diffList) {
		 //      if (error) throw error;

		 //      diffList.forEach(function(diff) {
		 //        diff.patches().forEach(function(patch) {
		 //          console.log("diff", patch.oldFile().path(), patch.newFile().path());
		 //          patch.hunks().forEach(function(hunk) {
		 //            console.log(hunk.header().trim());
		 //            hunk.lines().forEach(function(line) {
		 //              console.log(String.fromCharCode(line.lineOrigin) + line.content.trim());
		 //            });
		 //          });
		 //        });
		 //      });
		 //    });
	});
}