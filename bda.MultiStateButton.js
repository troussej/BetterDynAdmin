// ----- JQuery plugin functions -----

// Standard function to create a JQuery plugin entry point.
//
// @param methods Plugin methods.
// @param plugin Plugin name.

jQuery(document).ready(function() {
	(function($) {
		try {

			// Plugin constants
			var csts = {
				NAME: 'MultiStateButton'
			};
			var defaults = {
				defaultState : 'ON',
				states: [{
					name: 'ON',
					class: 'bda-button-on'
				}, {
					name: 'OFF',
					class: 'bda-button-off'
				}],
				callback: null,
				stateIndexAttr: 'data-state-index',
				stateAttr: 'data-state'
			};

			var methods = {

					// Initialize function, i.e plugin constructor.
					init: function(options) {
						console.log('Init plugin {0}'.format(csts.NAME));

						return this.each(function() {

							var $this = $(this);

							var settings = $.extend({}, defaults, options);
							methods._build($this, settings);
						});
					},

					// PUBLIC FUNCTIONS

					// PRIVATE FUNCTIONS
					_build: function($button, settings) {

						states = settings['states'];
						//no point on binding anything if there are no states
						if ($button != null && states != null && states.length > 0) {

							//find starting index from name
							var defIndex = null;
							var defState = settings.defaultState
							for (var i = states.length - 1; i >= 0 && defIndex ==null ; i--) {
								var b = states[i];
								if(b.name == defState){
									defIndex = i;
								}
							}
							if( defIndex == null){
								defIndex = 0;
							}
							console.log('defIndex = {0}'.format(defIndex));
							$button.attr(settings.stateIndexAttr, defIndex)
								.attr(settings.stateAttr, states[defIndex])
								.on('click', function() {
									var $this = $(this);
									var idx = $this.attr(settings.stateIndexAttr);

									var prevState = states[idx];

									idx++;
									if (idx >= states.length) {
										idx = 0;
									}

									var curState = states[idx];
									$this.removeClass(prevState.class)
										.addClass(curState.class)
										.attr(settings.stateIndexAttr, idx)
										.attr(settings.stateAttr, curState.name);

									if (settings.callback) {
										settings.callback($this,prevState,curState);
									}
								});
						}
					}

				}
				// Plugin entry point

			$.fn.multiStatesButton = basePlugin(methods, csts.NAME);

		} catch (e) {
			console.log(e);
		}

	})(jQuery);
});