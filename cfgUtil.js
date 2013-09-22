var fs = require('fs');

var cfgPath = "/http/cfg/data.cfg";

var read = exports.read = {
	properties: function(serverDir) {
		var file = fs.readFileSync(serverDir + cfgPath, 'utf8');
		return toJSON(file);
	},

	property: function(property, serverDir) {
		return read.properties(serverDir)[property];
	}
};

var write = exports.write = {
	properties: function(propertyMap, serverDir) {
		var cfg = read.properties(serverDir);

		// Add and overwrite values
		for (key in propertyMap) {
			cfg[key] = propertyMap[key];
		}

		write._commit(cfg, serverDir);
	},

	property: function(key, val, serverDir) {
		var cfg = read.properties(serverDir);
		cfg[key] = val;
		write._commit(cfg, serverDir);
	},

	_commit: function(json, serverDir) {
		var cfg = toCfgFile(json);
		fs.writeFileSync(serverDir + cfgPath, cfg);
	}
};

function toJSON(file) {
	var arr = file.split("\n");
	var cfg = {};
	for (var i = 0; i < arr.length; i++) {
		var propArr = arr[i].split("=");
		cfg[propArr[0]] = propArr[1];
	}

	return cfg;
}

function toCfgFile(json) {
	var cfg = "";
	for (key in json) {
		cfg += key + "=" + json[key] + "\n";
	}

	return cfg;
}