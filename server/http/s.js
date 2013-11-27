        /**
 	* Register a single plugin and stores the plugin in the plugin object container. Once the
 	* registration has occurred successfully, the onRegister function defined on the Plugin
 	* is called
 	*
 	* @param plugin
 	*     	A plugin defined by PentahoPluginHandler.Plugin
 	*
 	* @return PentahoPluginHandler.Plugin
 	* @throws Exception
 	*    	When the plugin is not a type of PentahoPluginHandler.Plugin
 	*    	When the plugin is already registered
 	*    	When the plugin has not been registered successfully after attempting to register it
 	*/
	var register = function(plugin);
