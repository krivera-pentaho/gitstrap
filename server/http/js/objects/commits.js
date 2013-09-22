define(['jquery', 'backbone'], function() {

	var Collection = Backbone.Collection.extend();

	var View = Backbone.View.extend({
		initialize : function() {
			var self = this;

			// Bind on add
			this.collection.on("add", function(CommitModel) {
				CommitModel.view.render().$el.appendTo(self.options.container);
				self.render();				
			})

			// Bind on remove
			this.collection.on("remove", function(CommitModel) {
				CommitModel.view.remove();
				self.render();
			});
		},
		render : function() {
			if (this.collection.length == 0) {
				this.options.wrapper.hide();
			} else {
				this.options.wrapper.show();
			}			
		}

	});

	return function($addToContainer, $wrapper, CommitList) {
		this.collection = new Collection();
		this.view = new View({
			collection: this.collection,
			container: $addToContainer,
			wrapper : $wrapper
		})

		var self = this;
		this.add = function(Commit) {
			self.collection.add(Commit.model);
		}

		this.remove = function(id) {
			self.collection.remove(self.collection.get(id));
		}

		this.clear = function() {
			$(self.collection.models).each(function(i, model) {
				self.collection.remove(model);
			});
		}

		$(CommitList).each(function(i, Commit){
			self.add(Commit);
		})
	}
});