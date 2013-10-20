define(['jquery', 'underscore', 'backbone'], function() {	

	var Collection = Backbone.Collection.extend();

	var View = Backbone.View.extend({
		initialize : function() {
			var self = this;
			
			// Bind on add
			this.collection.on("add", function(repositoryModel){
				self.render();
				self.options.container.append(repositoryModel.view.render().$el);
			});

			// Bind on change
			this.collection.on("change", function(repositoryModel) {
				var view = repositoryModel.view;
				view.$el.replaceWith(view.render().$el);
			});

			// Bind on remove
			this.collection.on("remove", function(repositoryModel){
				repositoryModel.view.remove();
				self.render();
			});
		},
		render: function(){
			if (this.collection.length == 0) {
				this.options.wrapper.hide();
			} else {
				this.options.wrapper.show();
			}
		}
	});

	return function($addToContainer, $wrapper, RepositoryList) {
		this.collection = new Collection();
		this.view = new View({
			collection: this.collection,
			container: $addToContainer,
			wrapper: $wrapper
		});

		var self = this;
		$(RepositoryList).each(function(i, Repository){
			self.collection.add(Repository.model);	
		});

		this.add = function(Repository) {
			self.collection.add(Repository.model);
		}

		this.remove = function(id) {
			self.collection.remove(self.collection.get(id));
		}

		this.each = function(exec) {
			$(self.collection.models).each(function(i, model) {
				exec(model);
			});
		}
	}
});
