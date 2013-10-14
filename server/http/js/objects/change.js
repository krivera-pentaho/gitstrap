define(["jquery", "underscore", "backbone", "handlebars"], function() {
	var Model = Backbone.Model.extend();

	var View = Backbone.View.extend({
		template: Handlebars.compile("<tr class='change-object {{state}}'><td>"+
			"{{fileName}}"+
			"<div class='full-file-path'>{{file}}</div></td></tr>"),

		render: function(appendTo) {

			var state = "warning";
			switch(this.model.get("status")) {
				case "new file":
					state="success"; break;
				case "deleted":
					state="error"; break;
			}

			var fullFile = this.model.get("file");
			var fileName = fullFile.replace(new RegExp("(\\S+/)*").exec(fullFile)[0], "");

			var attrs = this.model.attributes;
			attrs.state = state;
			attrs.fileName = fileName;
			this.setElement(this.template(attrs));			

			var self = this;
			this.$el
				.bind("click", function() {
					var changeType = self.model.get("changeType");
					var origChangeType = self.model.get("origChangeType");
					var status = self.model.get("status");
					var path = self.model.get("path");
					var file = self.model.get("file");

					var toChangeType = "staged";					
					if(changeType == "staged") {
						var toChangeType = origChangeType;
						if (origChangeType == "staged") {
							toChangeType = "unstaged";
							if (status == "new file") {
								toChangeType = "untracked";
							}
						}
					}

					self.model.set("changeType", toChangeType);
					if (toChangeType == "staged") {
						if (status != "deleted") {
							$.post("/git/staging/add?path=" + path + "&files=" + file, function success(data){})
						} else {
							$.post("/git/staging/remove?path=" + path + "&files=" + file, function success(data){})
						}
					} else {
						$.post("/git/staging/unstage?path=" + path + "&files=" + file, function success(data){})
					}
				});

			return this;
		}
	});

	return function(path, file, status, changeType, showLoading, hideLoading) {
		this.model = new Model({
			path: path,
			file: file,
			status: status,
			changeType: changeType,
			origChangeType: changeType
		});
		this.view = new View({
			model: this.model,
			showLoading: showLoading,
			hideLoading: hideLoading
		});

		this.model.view = this.view;
	}
});