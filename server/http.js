/*
 * Simple web server to interact with git
 */

var fs = require("fs");
var gitUtil = require("../gitUtil");
var cfgUtil = require("../cfgUtil");
var httpDir = __dirname;


var nodeRouter = require("../node-router");
var server = nodeRouter.getServer();
var url = require("url");

// Root
server.get("/", function (request, response) {
	response.writeHead(200, {"Content-Type": "text/html"});

	// Load index.html
	readHttpFile("index.html", 'utf8', function (err, data) {		
		response.end(data);
	});
});

// Git commands root
server.get("/git/isGitDir", function (request, response) {
	var queryData = url.parse(request.url, true).query;
	var path = queryData.path;	

	response.writeHead(200, {"Content-Type": "text/plain"});
	try {
		var isGitDir = gitUtil.isGitDir(path);
		response.end(isGitDir.toString());
	} catch(e) {
		console.error(e);
		response.end("false");
	}	
});

// File loader
server.get(new RegExp("^/((\\S+/)*\\S+(\\.\\S+))$"), function (request, response, match, match1, ext) {	
	
	var contentType = nodeRouter.mime.getMime(ext);	
	var encoding = contentType.search("text") == -1 ? null : 'utf8';

	// Read in file
	readHttpFile(match, encoding, function(err, data) {
		response.writeHead(data ? 200 : 404, {"Content-Type": contentType});		
		response.end(data);
	});	
});

// Get config properties
server.get("/cfg/all", function(request, response) {
	response.writeHead(200, {"Content-Type": nodeRouter.mime.getMime(".json")});
	response.end(JSON.stringify(cfgUtil.read.properties(httpDir)));
});

// Get Single cfg property
server.get("/cfg/single", function(request, response) {		
	var queryData = url.parse(request.url, true).query;
	var property = queryData.property;

	response.writeHead(200, {"Content-Type": nodeRouter.mime.getMime(".txt")});
	response.end(cfgUtil.read.property(property, httpDir));
});

// Put a single property 
server.post("/cfg/single", function(request, response) {
	var queryData = url.parse(request.url, true).query;
	var key = queryData.key;	
	var value = queryData.value;

	var statusCode = 200;
	try {
		cfgUtil.write.property(key, value, httpDir);	
	} catch(e) {
		console.log(e);
		statusCode = 500;
	}

	response.writeHead(statusCode);
	response.end();
});

// Put many properties in the cfg
server.post("/cfg/many", function(request, response) {
	var queryData = url.parse(request.url, true).query;
	var propertiesJson = eval("(" + queryData.properties + ")");
	
	var statusCode = 200;
	try {
		cfgUtil.write.properties(propertiesJson, httpDir);	
	} catch(e) {
		statusCode = 500;
	}

	response.writeHead(statusCode);
	response.end();
});

// Get current branch of repository
server.get("/git/branch/current", function(request, response) {
	var queryData = url.parse(request.url, true).query;
	var path = queryData.path;

	gitUtil.getCurrentBranch(path, function(branchName) {
		response.writeHead(200);
		response.end(branchName);
	});
});

// checkout a branch
server.post("/git/branch/checkout", function(request, response){
	var queryData = url.parse(request.url, true).query;
	var path = queryData.path;
	var branch = queryData.branch;

	gitUtil.checkoutBranch(path, branch, function(data){
		response.writeHead(200);
		response.end(data);
	})
});

// Get the list of references in a repository
server.get("/git/refs", function(request, response){
	var queryData = url.parse(request.url, true).query;
	var path = queryData.path;

	// Get the references from a git repository
	gitUtil.getReferences(path, function(references){		
		response.writeHead(200);
		response.end(references);
	});
});

// Get a list of commits from a given branch
server.get("/git/commits", function(request, response){
	var queryData = url.parse(request.url, true).query;
	var path = queryData.path;
	var branch = queryData.branch;
	var results = queryData.results;

	// Get the references from a git repository
	gitUtil.getCommits(path, branch, results, function(commits){
		response.writeHead(200);
		response.end(commits);
	});
});

// Get diffs of a branch from its sha ids
server.get("/git/diff/names", function(request, response){
	var queryData = url.parse(request.url, true).query;
	var path = queryData.path;
	var branch = queryData.branch;
	var sha1 = queryData.sha1;
	var sha2 = queryData.sha2;

	// Get the references from a git repository
	gitUtil.getDiffNames(path, branch, sha1, sha2, function(diffs){
		response.writeHead(200);
		response.end(diffs);
	});
});

// Get the diff of a file
server.get("/git/diff/file", function(request, response) {
	var queryData = url.parse(request.url, true).query;
	var path = queryData.path;
	var branch = queryData.branch;
	var sha1 = queryData.sha1;
	var sha2 = queryData.sha2;
	var fileName = queryData.fileName;

	gitUtil.getDiffFile(path, branch, sha1, sha2, fileName, function(fileDiffs){
		response.writeHead(200);
		response.end(fileDiffs);
	});
})

// Pulls data from a remote resource
server.post("/git/pull", function(request, response) {
	var queryData = url.parse(request.url, true).query;
	var path = queryData.path;
	var pullToBranch = queryData.pullToBranch;
	var remote = queryData.remote;
	var branch = queryData.branch;

	gitUtil.pull(path, pullToBranch, remote, branch, function(data){
		response.writeHead(200);
		response.end(data);
	});
});

// Retrieves the status of the repository
server.get("/git/status", function(request, response) {
	var queryData = url.parse(request.url, true).query;
	var path = queryData.path;

	gitUtil.getStatus(path, function(status) {
		response.writeHead(200);
		response.end(status);
	});
});

// Perform a rebase of one branch onto another
server.post("/git/rebase", function(request, response) {
	var queryData = url.parse(request.url, true).query;
	var path = queryData.path;
	var branch = queryData.branch;
	var rebaseFromBranch = queryData.rebaseFromBranch;

	gitUtil.rebase(path, branch, rebaseFromBranch, function(status) {
		response.writeHead(200);
		response.end(status);
	});
});

server.post("/git/staging/add", function(request, response) {
	var queryData = url.parse(request.url, true).query;
	var path = queryData.path;
	var files = queryData.files;

	gitUtil.stageFiles(path, files, function(err) {
		response.writeHead(200);
		response.end(err);
	});
})

server.post("/git/staging/remove", function(request, response) {
	var queryData = url.parse(request.url, true).query;
	var path = queryData.path;
	var files = queryData.files;

	gitUtil.removeFiles(path, files, function(err) {
		response.writeHead(200);
		response.end(err);
	});
})

server.post("/git/staging/unstage", function(request, response) {
	var queryData = url.parse(request.url, true).query;
	var path = queryData.path;
	var files = queryData.files;

	gitUtil.unstageFiles(path, files, function(err) {
		response.writeHead(200);
		response.end(err);
	});
})
function readHttpFile(path, encoding, callback) {
	var url = httpDir + "/http/" + path;
	fs.readFile(url, encoding, callback);
}

// Listen on port 8081
server.listen(8081);