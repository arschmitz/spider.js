module.exports = function( options, callback ) {
	var option, spider,
		startTime = new Date(),
		duration = require( "duration" ),
		spawn = require( "child_process" ).spawn,
		args = [ "test", __dirname + "/lib/tests.js" ];

	for ( option in options ) {
		if ( options.hasOwnProperty( option ) ) {
			args.push( "--" + option + "=" + options[ option ] );
		}
	}

	spider = spawn(
		__dirname + "/node_modules/casperjs/bin/casperjs",
		args,
		{
			stdio: "pipe"
		}
	);
	spider.stdout.on( "data", function( data ) {
		process.stdout.write( data );
	});
	spider.stderr.on( "data", function( data ) {
		process.stderr.write( data );
	});
	spider.on( "close", function( code ) {
		process.stdout.write( "Spider completed in ~" +
			new duration( startTime ).milliseconds + "ms \n" );
		if ( callback ) {
			callback( !!code );
		}
	});
};
