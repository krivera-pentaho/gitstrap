define(["jquery", "underscore", "backbone"], function() {
	var Collection = Backbone.Collection.extend({});
	var View = Backbone.View.extend({
		initialize: function() {
			var onAdd = function(ChangeModel) {				
				this.container.append(ChangeModel.view.render().$el);
			}

			var onRemove = function(ChangeModel) {
				ChangeModel.view.remove();
			}			
			
			this.options.stagedChanges.collection.on("add", onAdd, this.options.stagedChanges);
			this.options.unstagedChanges.collection.on("add", onAdd, this.options.unstagedChanges);
			this.options.untrackedChanges.collection.on("add", onAdd, this.options.untrackedChanges);

			this.options.stagedChanges.collection.on("remove", onRemove);
			this.options.unstagedChanges.collection.on("remove", onRemove);
			this.options.untrackedChanges.collection.on("remove", onRemove);

			var self = this;
			this.collection.on("change:changeType", function(ChangeModel) {
				var prevChangeType = ChangeModel.previousAttributes().changeType;
				var changeType = ChangeModel.get("changeType");

				switch(prevChangeType) {
					case "staged":
						self.options.stagedChanges.collection.remove(ChangeModel); break;
					case "unstaged":
						self.options.unstagedChanges.collection.remove(ChangeModel); break;
					case "untracked":
						self.options.untrackedChanges.collection.remove(ChangeModel); break;
				}

				switch(changeType) {
					case "staged":
						self.options.stagedChanges.collection.add(ChangeModel); break;
					case "unstaged":
						self.options.unstagedChanges.collection.add(ChangeModel); break;
					case "untracked":
						self.options.untrackedChanges.collection.add(ChangeModel); break;
				}
			});
		}
	});

	return function($stagedChanges, $unstagedChanges, $untrackedChanges) {
		this.collection = new Collection();	
		this.stagedChanges = new Collection();
		this.unstagedChanges = new Collection();
		this.untrackedChanges = new Collection();

		this.view = new View({
			stagedChanges: {
				collection: this.stagedChanges,
				container: $stagedChanges
			},
			unstagedChanges: {
				collection: this.unstagedChanges,
				container: $unstagedChanges
			},
			untrackedChanges: {
				collection: this.untrackedChanges,
				container: $untrackedChanges
			},
			collection: this.collection
		});

		this.addStagedChange = function(Change) {
			this.stagedChanges.add(Change.model);
			this.collection.add(Change.model);
		}

		this.removeStagedChange = function(id) {
			var model = this.stagedChanges.get(id);
			this.stagedChanges.remove(model);
			this.collection.remove(model);
		}

		this.addUnstagedChange = function(Change) {
			this.unstagedChanges.add(Change.model);
			this.collection.add(Change.model);
		}

		this.removeUnstagedChange = function(id) {
			var model = this.unstagedChanges.get(id);
			this.unstagedChanges.remove(model);
			this.collection.remove(model);
		}

		this.addUntrackedChange = function(Change) {
			this.untrackedChanges.add(Change.model);
			this.collection.add(Change.model);
		}

		this.removeUntrackedChange = function(id) {
			var model = this.untrackedChanges.get(id);
			this.untrackedChanges.remove(model);
			this.collection.remove(model);
		}

		var self = this;
		this.clear = function() {
			$(self.stagedChanges.models).each(function(i, model){
				self.stagedChanges.remove(model);
			});

			$(self.unstagedChanges.models).each(function(i, model){
				self.unstagedChanges.remove(model);
			});

			$(self.untrackedChanges.models).each(function(i, model){
				self.untrackedChanges.remove(model);
			});

			$(self.collection.models).each(function(i, model){
				self.collection.remove(model);
			});
		}
	}
});