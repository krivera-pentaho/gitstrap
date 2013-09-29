define(['jquery', 'underscore', 'backbone'], function(){
	var Collection = Backbone.Collection.extend();
	var Model = Backbone.Model.extend({
			defaults : {
				fileName: "Diffs"
			}
		});
	var View = Backbone.View.extend({

		initialize : function() {
			var self = this;

			// Bind on add
			this.collection.on("add", function(HunkModel){
				HunkModel.view.render().$el.appendTo(self.options.container);
				self.render();
			});

			// Bind on remove
			this.collection.on("remove", function(HunkModel) {
				HunkModel.view.remove();
				self.render();
			})
		},

		render: function() {
			this.options.wrapper.find("#file-name-header").text(this.model.get("fileName"));
			if (this.collection.length == 0) {
				this.options.wrapper.hide();
			} else {
				this.options.wrapper.show();
			}
		}
	});
	return function($addToContainer, $wrapper) {
		this.collection = new Collection();
		this.model = new Model();

		this.view = new View({
			collection: this.collection,
			model: this.model,
			container: $addToContainer,
			wrapper: $wrapper
		});

		var self = this;
		this.add = function(Hunk) {
			self.collection.add(Hunk.model);
		}

		this.remove = function(id) {
			self.collection.remove(self.collection.get(id));
		}

		this.clear = function() {
			$(self.collection.models).each(function(i, HunkModel) {
				self.collection.remove(HunkModel);
			});
		}
	}
});