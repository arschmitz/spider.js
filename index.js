module.exports = function( options ) {
	var option, spider,
		spawn = require( "child_process" ).spawn,
		args = [ "test", __dirname + "/lib/tests.js" ];

	for( option in options ) {
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
	spider.stdout.on( "data", function ( data ) {
		process.stdout.write( data );
	});
	spider.stderr.on( "data", function ( data ) {
		process.stderr.write( data );
	});
};