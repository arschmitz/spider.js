#!/usr/local/bin/node

var args = process.argv.slice( 0 );
args[ 0 ] = "test";
args[ 1 ] = __dirname + "/../lib/tests.js";
console.log( __dirname + "/../node_modules/casperjs/bin/casperjs" );
var spawn = require('child_process').spawn(
	__dirname + "/../node_modules/casperjs/bin/casperjs",
	args, {
		stdio: "pipe"
	}
);
spawn.stdout.on('data', function (data) {
	process.stdout.write( data );
});
spawn.stderr.on('data', function (data) {
  process.stderr.write( data );
});