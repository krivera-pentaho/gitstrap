define(['AlertBuilder','jquery', 'backbone', 'handlebars'], function(AlertBuilder) {

	// Backbone Model
	var Model = Backbone.Model.extend({
	});

	// Backbon View
	var View = Backbone.View.extend({
		template: Handlebars.compile(
			"<div class='git-object repository-object img-rounded' data-toggle='context' data-target='#repository-object-context-menu'>"+
				"<div class='title text-center' title='{{alias}}'>{{shortAlias}}</div>"+
				"<div class='content'>"+
					"<div class='{{statusClass}}'><strong>Status:</strong> {{{status}}}</div>"+
					"<div><strong>Branch:</strong> {{branch}}</div>"+					
					"<div title='{{path}}'><strong>Path:</strong> {{path}}</div>"+					
					"{{content}}"+
				"</div>"+
			"</div>"),

		loadingImgTemplate: "<img src='img/ajax-loader.gif'></img>",

		render : function() {
			var self = this;

			var statusClass = "text-info";
			switch(this.model.get("status")) {
				case "Unmodified": statusClass = "text-success"; break;
				case "Modified": statusClass = "text-warning"; break;
				case "Conflict": statusClass = "text-error"; break;
			}

			var attrs = this.model.attributes;
			attrs.statusClass = statusClass;

			// Use loading template
			if (attrs.status == "") {
				attrs.status = this.loadingImgTemplate;
			}

			attrs.shortAlias = attrs.alias;
			if (attrs.shortAlias.length > 20) {
				attrs.shortAlias = attrs.shortAlias.substr(0,20) + "...";
			}
							
			this.setElement(
				this.template(attrs));

			// Do not bind any functionality to repo
			if (this.model.get("status") == "ERROR") {
				return this;
			}

			var path = this.model.get("path");
			var alias = this.model.get("alias");
			var branch = this.model.get("branch");

			this.$el
				.attr("alias", alias)
				.attr("path", path)	
				.attr("branch", branch)
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

					$("#selected-repository")
						.empty()
						.append($this.clone(true, true));
					$("#selected-items").show();
				})				
				.contextmenu({
					onItem: function(e, item) {
						var id = $(item).attr("id");

						switch (id) {
							case "remove-repo-context": 
								self.options.showRemoveRepoModal(); break;
							case "edit-repo-context": 
								self.options.showEditRepoModal(alias, path); break;
							case "stage-changes-context":								
								self.options.showStageChangesModal(); 
								self.options.getChanges(path);
								break;
						}
					}
				});
			
			return this;
		}
	});
	
	return function(path, alias, getReferences, getChanges, showEditRepoModal, 
		showRemoveRepoModal, showStageChangesModal, showLoading, hideLoading) {		
		this.model = new Model({
			path: path,
			alias: alias,
			branch: "",
			status: "",
			id: alias
		});

		this.view = new View({
			model: this.model,
			getReferences: getReferences,
			getChanges: getChanges,
			showEditRepoModal: showEditRepoModal,
			showRemoveRepoModal: showRemoveRepoModal,
			showStageChangesModal: showStageChangesModal,
			showLoading: showLoading,
			hideLoading: hideLoading
		});

		this.model.view = this.view;
	}
});