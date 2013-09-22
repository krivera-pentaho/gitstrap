define(['jquery', 'handlebars', 'backbone'], function() {

	var localRef = "refs/heads/";
	var remoteRef = "refs/remotes/";
	var tagRef = "refs/tags/";

	var Model = Backbone.Model.extend({

	});

	var View = Backbone.View.extend({
		template : Handlebars.compile(
			"<div class='git-object reference-object img-rounded' {{#if isLocalReference}} data-toggle='context' data-target='#reference-object-context-menu' {{/if}}>" +
				"<div class='title text-center' title='{{reference}}'>{{title}}</div>"+
				"<div class='content'>"+					
				"</div>" +
			"</div>"),

		render: function() {
			var self = this;
			var title = this.model.get("reference")
				.replace(localRef, "")
				.replace(remoteRef, "")
				.replace(tagRef, "");

			var reference = this.model.get("reference");
			var isLocalReference = reference.search(localRef) > -1;
			this.setElement(
				this.template({
					title: title,
					reference: reference,
					isLocalReference: isLocalReference
				}));

			var path = this.model.get("path");
			this.$el
				.attr("reference", title)
				.attr("path", path);

				if (isLocalReference) {
					this.$el
						.bind("click contextmenu", function() {
							$this = $(this);
							$this.siblings().removeClass("active");
							$this.addClass("active");
														
							self.options.getCommits(path, title, 10);
						})						
						.draggable({ revert : true 	})
						.addClass("local-reference-object");	
				}

			return this;
		}
	});

	return function(reference, path, getCommits) {
		this.model = new Model({
			reference: reference,
			path: path,
			id: reference
		});

		this.view = new View({
			model: this.model,
			getCommits: getCommits
		});

		this.model.view = this.view;
	}
});