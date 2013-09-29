define(['jquery', 'handlebars', 'underscore', 'backbone'], function() {

	var hunkTemplate = Handlebars.compile(
		"<table class='table table-condensed table-bordered hunk-objects'>"+
		"</table>");

	var lineTemplate = Handlebars.compile(
		"<tr class='line-object {{type}}'>"+
			"<td class='code-type'>{{codeType}}</td>" +
			"<td>{{line}}</td>"+
		"</tr>");

	var Model = Backbone.Model.extend();
	var View = Backbone.View.extend({
		render: function() {
			var hunk = $(hunkTemplate({}));

			$(this.model.get("lines")).each(function(i, line){				
				var type = line[0];
				if (type == "\\") {
					return;
				}

				var lineType = (i == 0 ? "warning" : "");
				switch(type) {
					case "-": lineType = "error"; break;
					case "+": lineType = "success"; break;
				}

				var code = line[1];
				code = (code == "" ? " " : code);

				var lineObj = $(lineTemplate({
					codeType : type,
					type: lineType,
					line: code
				}));

				hunk.append(lineObj);
			});

			this.setElement(hunk);

			return this;
		}
	});

	return function(lines) {
		this.model = new Model({
			lines: lines
		});

		this.view = new View({
			model: this.model
		});

		this.model.view = this.view;
	}
});