define(['AlertBuilder', 'jquery', 'handlebars', 'backbone'], function(AlertBuilder) {

	var localRef = "refs/heads/";
	var remoteRef = "refs/remotes/";
	var tagRef = "refs/tags/";

	var localReferenceClass = "local-reference-object";
	var remoteReferenceClass = "remote-reference-object";

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
							if ($this.attr("was-dropped") == "true" || $this.attr("dragging") == "true") {
								$this.attr("was-dropped", "false");
								return;
							}

							$this.siblings().removeClass("active");
							$this.addClass("active");
														
							self.options.getCommits(path, title, 10);
						})												
						.addClass(localReferenceClass);	
				} else if (reference.search(remoteRef) > -1) {
					this.$el
						.draggable({ revert: true })
						.addClass(remoteReferenceClass);
				}

				this.$el
					.draggable({ 
						revert : true,
						start: function(event, ui) {
							ui.helper.css("z-index", 2);
							ui.helper.attr("dragging", "true");
						},
						stop: function(event, ui) {
							ui.helper.css("z-index", 0);
							ui.helper.attr("dragging", "false");
						}
					})
					.droppable({
						accept: function(draggable){
							return (self.$el.hasClass(localReferenceClass) && 
										draggable.hasClass("reference-object")) || 
									(self.$el.hasClass(remoteReferenceClass) &&
										draggable.hasClass(localReferenceClass));

						},

						hoverClass: "ui-state-highlight",

						drop: function(event, ui) {
							if (self.$el.hasClass(localReferenceClass)){
								if (ui.helper.hasClass(localReferenceClass)) {
									// perform rebase
								} else if (ui.helper.hasClass(remoteReferenceClass)) {
									var remoteAndBranch = ui.helper.attr("reference").split("/");

									// Submit pull request
									self.options.showLoading();
									$.post(getBaseUrl("/git/pull"+
										"?path=" + path +
										"&pullToBranch=" + title +
										"&remote=" + remoteAndBranch[0] + 
										"&branch=" + remoteAndBranch[1]), function success(data) {

											var messages = eval("(" + data + ")");
											var $appendMessageTo = $("#repository-references-container .alert-container");
											if (messages.error.search("error:") > -1) {
												AlertBuilder.build("Error pulling from remote (" + messages.error + ")", "ERROR", $appendMessageTo);
											} else {
												if (self.$el.hasClass("active")){
													self.options.clearCommits();
													self.$el.removeClass("active");
												}
												
												AlertBuilder.build("Pull from '" + ui.helper.attr("reference") + "'' to '" + title + "'' successful", "SUCCESS", $appendMessageTo);
											}

											
											
											self.options.hideLoading();
									})
								}	
							} else if (self.$el.hasClass(remoteReferenceClass)) {
								// perform push to remote
							}							
						}
					})

			return this;
		}
	});

	return function(reference, path, getCommits, clearCommits, showLoading, hideLoading) {
		this.model = new Model({
			reference: reference,
			path: path,
			id: reference
		});

		this.view = new View({
			model: this.model,
			getCommits: getCommits,
			clearCommits: clearCommits,
			showLoading: showLoading, 
			hideLoading: hideLoading
		});

		this.model.view = this.view;
	}
});