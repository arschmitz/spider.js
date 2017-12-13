module.exports = function( options, callback ) {
	var option, spider,
		startTime = new Date(),
		findup = require( "findup-sync" ),
		duration = require( "duration" ),
		spawn = require( "child_process" ).spawn,
		casperPath = findup( "node_modules/.bin/casperjs", {
			cwd: __dirname
		} ),
		args = [ "test", __dirname + "/lib/tests.js" ];

	for ( option in options ) {
		if ( options.hasOwnProperty( option ) ) {
			args.push( "--" + option + "=" + options[ option ] );
		}
	}

	spider = spawn(
		casperPath,
		args,
		{
			stdio: "pipe"
		}
	);
	spider.stdout.on( "data", function( data ) {
		process.stdout.write( data );
	} );
	spider.stderr.on( "data", function( data ) {
		process.stderr.write( data );
	} );
	spider.on( "close", function( code ) {
		process.stdout.write( "Spider completed in ~" +
			new duration( startTime ).milliseconds + "ms \n" );
		if ( callback ) {
			callback( code );
		}
	} );
};
