var fs = require('fs');

var cfgPath = "http/cfg/data.cfg";

var read = exports.read = {
	properties: function() {
		var file = fs.readFileSync(cfgPath, 'utf8');
		return toJSON(file);
	},

	property: function(property) {
		return read.properties()[property];
	}
};

var write = exports.write = {
	properties: function(propertyMap) {
		var cfg = read.properties();

		// Add and overwrite values
		for (key in propertyMap) {
			cfg[key] = propertyMap[key];
		}

		write._commit(cfg);
	},

	property: function(key, val) {
		var cfg = read.properties();
		cfg[key] = val;
		write._commit(cfg);
	},

	_commit: function(json) {
		var cfg = toCfgFile(json);
		fs.writeFileSync(cfgPath, cfg);
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