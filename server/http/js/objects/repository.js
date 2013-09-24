define(['AlertBuilder','jquery', 'backbone', 'handlebars'], function(AlertBuilder) {

	// Backbone Model
	var Model = Backbone.Model.extend({
	});

	// Backbon View
	var View = Backbone.View.extend({
		template: Handlebars.compile(
			"<div class='git-object repository-object img-rounded' data-toggle='context' data-target='#repository-object-context-menu'>"+
				"<div class='title text-center'>{{alias}}</div>"+
				"<div class='content'>"+
					"<div><strong>Branch:</strong> {{branch}}</div>"+
					"<div title='{{path}}'><strong>Path:</strong> {{path}}</div>"+
					"{{content}}"+
				"</div>"+
			"</div>"),

		render : function() {
			var self = this;
							
			this.setElement(
				this.template(this.model.attributes));

			var path = this.model.get("path");
			var alias = this.model.get("alias");
			var branch = this.model.get("branch");

			this.$el
				.attr("alias", alias)
				.attr("path", path)
				.droppable({
					accept: function(draggable){											
						return path == draggable.attr("path") && 
							draggable.attr("reference") != branch && 
							draggable.hasClass("local-reference-object");
					},
					hoverClass: "ui-state-highlight",
					drop: function(event, ui) { 
						var droppedBranch = ui.helper.attr("reference");
						ui.helper.attr("was-dropped", "true");
						self.options.showLoading();
						
						// Checkout branch on drop
						$.post(getBaseUrl("/git/branch/checkout" + "?path=" + path + "&branch=" + droppedBranch),							
							function success(data) {
								self.options.hideLoading();
								var messageJSON = eval("(" + data + ")");

								if (messageJSON.error.search("error:") > -1) {
									AlertBuilder.build("Error switching branch (" + messageJSON.error + ")", "ERROR", $("#alert-bar"));
									return;
								}

								self.model.set("branch", droppedBranch);							
								AlertBuilder.build("Switched " + alias + " to " + droppedBranch, "SUCCESS", $("#alert-bar"));
							});
					}
				})
				.bind("click contextmenu", function(event) {
					var $this = $(this);

					$(".repository-object").removeClass("active");
					$this.addClass("active");

					if (event.button == 2) {
						return;
					}

					self.options.getReferences(alias, path);
					$("#commit-history-container").hide();
				})
				.contextmenu({
					onItem: function(e, item) {
						var id = $(item).attr("id");

						switch (id) {
							case "remove-repo-context": 
								self.options.showRemoveRepoModal(); break;
							case "edit-repo-context": 
								self.options.showEditRepoModal(alias, path); break;
						}
					}
				});
			
			return this;
		}
	});
	
	return function(path, alias, branch, getReferences, showEditRepoModal, showRemoveRepoModal, showLoading, hideLoading) {		
		this.model = new Model({
			path: path,
			alias: alias,
			branch: branch,
			id: alias
		});

		this.view = new View({
			model: this.model,
			getReferences: getReferences,
			showEditRepoModal: showEditRepoModal,
			showRemoveRepoModal: showRemoveRepoModal,
			showLoading: showLoading,
			hideLoading: hideLoading
		});

		this.model.view = this.view;
	}
});