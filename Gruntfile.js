/*
 * casper-spider
 * https://github.com/arschmitz/grunt-spider
 *
 * Copyright (c) 2015 Alexander Schmitz
 * Licensed under the MIT license.
 */

module.exports = function( grunt ) {
	// Project configuration.
	grunt.initConfig({
		jshint: {
			all: [ "*.js" ],
			options: {
				jshintrc: ".jshintrc"
			}
		},

		jscs: {
			all: [ "*.js" ]
		}

	});

	// Actually load this plugin"s task(s).
	grunt.loadTasks( "tasks" );
	// grunt plugins
	require( "load-grunt-tasks" )( grunt );
	// These plugins provide necessary tasks.
	grunt.loadNpmTasks( "grunt-contrib-jshint" );
	grunt.loadNpmTasks( "grunt-jscs");

	// By default, lint and run all tests.
	grunt.registerTask( "default", [ "jshint", "jscs" ]);

};
