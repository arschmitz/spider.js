/*
 * Spider.js
 * https://github.com/arschmitz/spider.js
 *
 * Copyright (c) 2015 Alexander Schmitz
 * Licensed under the MIT license.
 */

module.exports = function( grunt ) {
	require( "load-grunt-tasks" )( grunt );

	// Project configuration.
	grunt.initConfig( {
		jshint: {
			all: [ "*.js" ],
			options: {
				jshintrc: ".jshintrc"
			}
		},

		jscs: {
			all: [ "*.js" ]
		}

	} );

	grunt.registerTask( "test", [ "jshint", "jscs" ] );

	// By default, run all tests.
	grunt.registerTask( "default", [ "test" ] );

};
