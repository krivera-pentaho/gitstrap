define(['jquery', 'backbone'], function() {

	var Model = Backbone.Model.extend({});
	var Collection = Backbone.Collection.extend({});
	var View = Backbone.View.extend({
		initialize : function() {
			this.collection.on("change:active", function(RouteModel, val) {
				this.render(RouteModel.view, val);
			}, this);
		},
		render : function(RouteView, entering) {
			var self = this;
			RouteView.render(function($el) {
				self.options.container.empty().append($el);	
			});			
		}
	});

	return function($viewContainer) {
		this.collection = new Collection();
		this.model = new Model();
		this.view = new View({
			model : this.model,
			collection : this.collection,
			container : $viewContainer
		});

		this.addRoute = function(Route) {
			Route.router = this;
			this.collection.add(Route.model);
		}

		this.enable = function(view) {
			var activeRoute = this.model.get("active-route");
			if (activeRoute) {
				this.model.get(activeRoute).set("active", false);
			}

			this.collection.get(view).set("active", true);
		}
	}
});