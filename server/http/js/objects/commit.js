define(['jquery', 'jquery-ui', 'handlebars', 'backbone'], function() {

	var diffNamesObjectTemplate = Handlebars.compile(
		"<table class='table table-hover table-striped table-bordered table-condensed diff-names-object'>" +
		"</table>");

	var diffNameObjectTemplate = Handlebars.compile(
		"<tr class='{{modification}}'>" +
			"<td class='diff-name-object'>" +
				"{{fileName}}" +
				"<div class='full-file-path'>" +
					"{{file}}" +
				"</div>" +
			"</td>" +
		"</tr>");

	var Model = Backbone.Model.extend();
	var View = Backbone.View.extend({
		template: Handlebars.compile(
			"<div class='git-object commit-object img-rounded'>"+
				"<div class='title text-center' title='{{commit}}'>{{commit}}</div>"+
				"<div class='content text-left'>"+
					"<div><strong>Author: </strong> {{author}}</div>"+
					"<div><strong>Date: </strong> {{date}}</div>"+
					"<div><strong>Message: </strong> {{message}}</div>"+
				"</div>"+
			"</div>"),
		
		render: function() {
			var self = this;

			this.setElement(
				this.template(this.model.attributes));

			this.$el
				.attr("commit", this.model.get("commit"))
				.bind("click", function(){
					$this = $(this);
					$this.siblings().removeClass("active");
					$this.addClass("active");
						
					$.get(getBaseUrl("/git/diffs?path=" + self.model.get("path") + 
							"&branch=" + self.model.get("branch") + 
							"&sha1=" + $this.next().attr("commit") +
							"&sha2=" + $this.attr("commit")), 
						function success(data){
							$(".diff-names-object").remove();
							var diffNames = eval("(" + data + ")");

							if (diffNames.error || diffNames.lenth == 0) {
								return;
							}

							var diffNamesObject = $(diffNamesObjectTemplate({}));

							$(diffNames).each(function(i, diffName) {
								var modification;

								switch(diffName[0]) {
									case "M" : modification = "warning"; break;
									case "D" : modification = "error"; break;
									case "A" : modification = "success"; break;
								}



								var fullFile = diffName[1];
								var fileName = fullFile.replace(new RegExp("(\\S+/)*").exec(fullFile)[0], "");
								var diffNameObject = $(diffNameObjectTemplate({
									modification: modification,
									fileName: fileName,
									file: fullFile
								}));
								diffNamesObject.append(diffNameObject);
							});

							$this.append(diffNamesObject);
					 	});
				});


			return this;
		}
	});

	return function(commit, date, author, message, branch, path) {
		this.model = new Model({
			commit: commit,
			date: date,
			author: author,
			message: message,
			branch: branch,
			path: path
		});

		this.view = new View({
			model: this.model
		})

		this.model.view = this.view;
	}
});