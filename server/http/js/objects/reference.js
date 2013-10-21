define(['AlertBuilder', 'jquery', 'handlebars', 'underscore', 'backbone'], function(AlertBuilder) {

	var localRef = "refs/heads/";
	var remoteRef = "refs/remotes/";
	var tagRef = "refs/tags/";

	var localReferenceClass = "local-reference-object";
	var remoteReferenceClass = "remote-reference-object";

	var Model = Backbone.Model.extend({

	});

	var View = Backbone.View.extend({
		template : Handlebars.compile(
			"<div class='git-object reference-object img-rounded'>" +
				"<div class='title text-center' title='{{reference}}'>{{title}}</div>"+
				"<div class='content'>"+
					"{{#if isNotLocalReference}}" +
						"<div><strong>Branch: </strong>{{branch}}</div>" +
					"{{/if}}" +
				"</div>" +
			"</div>"),

		render: function() {
			var self = this;
			var title = this.model.get("reference")
				.replace(localRef, "")
				.replace(remoteRef, "")
				.replace(tagRef, "");

			var remote = title.split("/")[0];
			var branch = title.split("/")[1];

			var reference = this.model.get("reference");
			var isLocalReference = reference.search(localRef) > -1;
			this.setElement(
				this.template({
					title: remote,
					reference: reference,
					isLocalReference: isLocalReference,
					isNotLocalReference: !isLocalReference,
					branch: branch
				}));

			var path = this.model.get("path");
			this.$el
				.attr("branch", branch)
				.attr("reference", title)
				.attr("path", path);

				if (isLocalReference) {
					this.$el
						.bind("click", function() {
							$this = $(this);
							if ($this.attr("was-dropped") == "true" || $this.attr("dragging") == "true") {
								$this.attr("was-dropped", "false");
								return;
							}

							$this.siblings().removeClass("active");
							$this.addClass("active");

							$("#selected-branch")
								.empty()
								.append($this.clone(true, true));

							self.options.onClick(self.$el);
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

							function disableSelection() {
								if (self.$el.hasClass("active")) {
									self.$el.removeClass("active");
								}
							}
							var $appendMessageTo = $("#repository-references-container .alert-container");

							if (self.$el.hasClass(localReferenceClass)) {
								if (ui.helper.hasClass(localReferenceClass)) {

									self.options.showLoading();
									$.post(getBaseUrl("/git/rebase" +
										"?path=" + path +
										"&branch=" + title + 
										"&rebaseFromBranch=" + ui.helper.attr("reference")), 
										function success(data) {
											var message = eval("(" + data + ")");

											if (message.error.search("error:") > -1) {
												AlertBuilder.build("Error performing rebase", "ERROR", $appendMessageTo);
											} else {
												disableSelection();
												AlertBuilder.build("Successfuly rebased " + title, "SUCCESS", $appendMessageTo);
											}

											self.options.hideLoading();
										});
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
											if (messages.error.search("error:") > -1) {
												AlertBuilder.build("Error pulling from remote (" + messages.error + ")", "ERROR", $appendMessageTo);
											} else {
												disableSelection();												
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

	return function(reference, path, showLoading, hideLoading, onClick) {
		this.model = new Model({
			reference: reference,
			path: path,
			id: reference
		});

		this.view = new View({
			model: this.model,
			showLoading: showLoading, 
			hideLoading: hideLoading,
			onClick : onClick
		});

		this.model.view = this.view;
	}
});