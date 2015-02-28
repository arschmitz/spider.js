#!/usr/local/bin/node

var options = {},
	args = process.argv.slice( 0 ),
	spider = require( "../index.js" );

args.splice( 0, 2 );
args.forEach( function( value ) {
	var arg = value.match( /^(?:--)((?:[a-zA-Z])*)(?:=)((?:.)*)/ );
	options[ arg[ 1 ] ] = arg[ 2 ];
});

spider( options );
