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

			if (!entering) {
				RouteView.$el
					.hide("slide", {
						easing : "easeInOutCubic",
						direction : "left"
					}, function() {
						RouteView.$el.remove();
						RouteView.model.set("deactivated", true);
						RouteView.model.set("deactivated", false);
					});
				return;
			}

			RouteView.render(function($el) {
				self.options.container.append($el.hide());	

				$el
					// .css( { display : "inline-block" })
					.show("slide", { 
						easing : "easeInOutCubic",
						direction : "right"
					}, function() {
						// RouteView.options.onLoad.call(self, self.$el);
					});
			});			
		}
	});

	return function($viewContainer, preActivate) {
		this.collection = new Collection();
		this.model = new Model({
			"active-route" : null
		});
		this.view = new View({
			model : this.model,
			collection : this.collection,
			container : $viewContainer
		});

		this.addRoute = function(Route) {
			Route.router = this;
			this.collection.add(Route.model);
		}

		this.enable = function(routeId, disablePreActivate) {
			var self = this;

			if (!routeId || this.model.get("active-route") == routeId) {
				return;
			}

			var activeViewExists = false;
			$(this.collection.models).each(function (i, RouteModel) {
				if (RouteModel.get("active")) {
					RouteModel.set("active", false);
					activeViewExists = true;
				}
			});

			function activate() {
				if (preActivate && !disablePreActivate) {					
					preActivate(this.model.get("active-route"), routeId);
				}

				this.collection.get(routeId).set("active", true);
				this.model.set("active-route", routeId);				
			}
			
			if (activeViewExists) {
				this.collection.once("change:deactivated", function() {
					activate.call(this);
				}, this)
				return;
			}

			activate.call(this);		
		}
	}
});