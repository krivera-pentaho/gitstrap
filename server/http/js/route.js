define(['jquery', 'backbone'], function() {

	var Model = Backbone.Model.extend({});
	var View = Backbone.View.extend({
		render : function(callback) {
			var self = this;

			// Retrieve content
			$.get(this.model.get("url"), function success(data) {
				self.setElement(data);
				callback.apply(self, self.$el);

				self.options.onLoad.apply(self, self.$el);
			});

			return this;
		}
	})	

	return function(view, url, onLoad, onNext, onBack) {
		this.model = new Model({
			id : view,
			url : url,
			view : view,
			active : false
		});

		this.view = new View({
			model : this.model,
			onLoad : onLoad,
			onNext : onNext,
			onBack : onBack
		});

		this.model.view = this.view;
	}
});