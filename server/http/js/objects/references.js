define(['jquery', 'handlebars', 'backbone'], function(){

	var $localRefs = $("#local-references");
	var localRef = "refs/heads/";

	var $remoteRefs = $("#remote-references");
	var remoteRef = "refs/remotes/"

	var $tagRefs = $("#tag-references");
	var tagRef = "refs/tags/"

	var Collection = Backbone.Collection.extend({

	});

	var View = Backbone.View.extend({
		initialize : function() {
			var self = this;

			// Bind on add actions
			this.collection.on("add", function(ReferenceModel) {
				var $appendTo;
				var ref = ReferenceModel.get("reference");

				if (ref.search(localRef) != -1) {
					$appendTo = $localRefs;
				} else if (ref.search(remoteRef) != -1) {
					$appendTo = $remoteRefs;
				} else if (ref.search(tagRef) != -1) {
					$appendTo = $tagRefs;
				}

				ReferenceModel.view.render().$el.appendTo($appendTo);
				self.render();
			});

			this.collection.on("remove", function(Reference) {
				Reference.view.remove();
				self.render();
			})
		},
		render : function() {
			if (this.collection.length > 0) {
				this.options.wrapper.show();				
			} else {
				this.options.wrapper.hide();
			}		
		}

	});

	return function($wrapper, ReferenceList) {


		this.collection = new Collection();
		this.view = new View({
			collection: this.collection,
			wrapper: $wrapper
		})

		var self = this;
		this.add = function(Reference) {
			self.collection.add(Reference.model);
		}

		this.remove = function(id) {
			self.collection.remove(self.collection.get(id));
		}

		this.clear = function() {
			$(self.collection.models).each(function(i, model){
				self.collection.remove(model);
			});
		}

		$(ReferenceList).each(function(i, Reference){
			self.add(Reference);
		});
	}
})