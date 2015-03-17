/*global casper: false */
var url,
	fs = require( "fs" ),
	currentIndex = 0,
	startUrl = casper.cli.get( "url" ) || "http://localhost/",
	ignore = new RegExp( casper.cli.get( "ignore" ) || " " ),
	output = casper.cli.get( "output" ) || false,
	logs = [],
	extensionBlacklist = new RegExp( casper.cli.get( "extensionBlacklist" ) ||
		".jpg|.gif|.png|.svg|.jpeg|.JPG|.JPEG|.js|.css|.zip" ),
	links = [ startUrl ],
	linkObject = {},
	statusCodes = {
		redirect: [ "301", "305", "306", "308" ],
		client: [ "400", "401", "403", "404" ]
	},
	errors = {
		script: [],
		client: [],
		redirect: [],
		resource: [],
		caught: []
	},
	check = {
		redirect: !!casper.cli.get( "redirectError" ) || true,
		client: !!casper.cli.get( "clientError" ) || true,
		script: !!casper.cli.get( "scriptError" ) || true,
		resource: !!casper.cli.get( "resourceError" ) || true
	},
	format = {
		url: "WARNING",
		redirectUrl: "",
		status: "",
		stage: "",
		statusText: "",
		file: "",
		line: "",
		functionCall: ""
	};

// Set some basic casper options
casper.options.viewportSize = {
	width: 1024,
	height: 768
};
casper.options.pageSettings.resourceTimeout = 20000;

// Log messages from an object
function echoMessage( message, tab ) {
	for ( var key in message ) {
		casper.echo( ( tab ? "    " : "" ) + key + ": " + message[ key ], format[ key ] );
	}
}

casper.echo = ( function( original ) {
	return function( message ) {
		logs.push( message );
		original.apply( this, arguments );
	};
})( casper.echo );

// Check if the link is under the start url in the directory structure
function checkInternal( link ) {
	return link.search( startUrl ) !== -1;
}

// Check the ignore list
function checkIgnore( link ) {
	return ignore.test( link );
}

// check the extension black list the stops us from trying to run tests on
// things like images
function checkExtensionBlacklist( link ) {
	return extensionBlacklist.test( link );
}
// please jshint until i use this
checkExtensionBlacklist( "foo" );

// Log status errors
function statusError( resource, errorLog ) {
	var message = {
		url: resource.url,
		redirectUrl: resource.redirectURL,
		status: resource.status,
		stage: resource.stage,
		statusText: resource.statusText
	};
	if ( links.indexOf( resource.url ) === -1 ) {
		message.sourceUrl = url;
	}

	// Log the message for error reporting
	errorLog.push( message );

	// echo the message for any one watching
	echoMessage( message );
}

// Just keeps all the bindings in a single place
function bindEvents(){

	// Check if script error checking is enabled
	if ( check.script ) {

		// Listen for JS script errors and warnings on the page
		casper.on( "page.error", function( msg, trace ) {

			// Bail if this is not part of the site we started on we dont care about errors on
			// third party sites
			if ( !checkInternal( this.getCurrentUrl() ) ) {
				return;
			}

			var message = {
				msg: "Error: " + msg,
				url: "url: " +  url,
				file: "file: " + ( trace[0] ? trace[0].file : "Not Available" ),
				line: "line: " + ( trace[0] ? trace[0].line : "Not Available" ),
				functionCall: "function: " + ( trace[0] ? trace[0][ "function "] : "Not Available" )
			};

			// Echo the message for any one watching
			echoMessage( message );

			// Log the message for test reporting
			errors.script.push( message );
		});
	}

	// Set listeners for all the status codes for 4xx and 3xx status
	[ "client", "redirect" ].forEach( function( value ) {

		// Check if this test is enabled
		if ( check[ value ] ) {
			statusCodes[ value ].forEach( function( code ) {
				casper.on("http.status." + code, function( resource ) {
					statusError( resource, errors[ value ] );
				});
			});
		}
	});

	// Check if resource checking is enabled
	if ( check.resource ) {
		casper.on( "resource.error", function( error ) {

			// Check for resource errors on internal pages
			// If the error is operation canceled ignore it phantom has issues...
			if ( error.errorCode === 5 || !checkInternal( url ) ) {
				return;
			}

			// The error does not contain the page which requested the resource
			// So lets add it
			error.requestedBy = url;

			// Log error for test reporting
			errors.resource.push( error );

			// Echo the error for anyone listening
			echoMessage( error );
		});
	}

	// Stop crawl if there"s an internal error this is an error in casper not the page
	casper.on( "error", function( msg, backtrace ) {
		this.echo( "INTERNAL ERROR: " + msg, "ERROR" );
		this.echo( "BACKTRACE:" + backtrace, "WARNING" );
		this.die( "Crawl stopped because of errors." );
	});
}

function checkPage(){

	// Set the current url to be available globally
	url = links[ currentIndex ];

	var internal = checkInternal( url );

	// Just increments the global index and kicks of the next page
	function next() {
		if ( currentIndex < links.length - 1 ) {
			currentIndex++;
			checkPage();
		}
	}

	// If we should ignore this page based on the options just move on to the next link
	if ( checkIgnore( url ) ) {
		next();
		return;
	}

	if ( casper.options.verbose ) {
		casper.echo( "Loading " + ( internal ? "internal" : "external" ) + " Page: " + url );
	}

	// Open the page
	casper.open( url ).then( function() {

		// If this is an external page stop here and go to the next one no need to crawl
		if ( !internal ) {
			next();
			return;
		}

		// Evaluate the page to return a list of unique links
		this.evaluate( function() {
			var i, pageLinks = [],
				links = document.getElementsByTagName( "a" );

			for ( i = 0; i < links.length; ++i ) {
				if ( pageLinks.indexOf( links[ i ].href ) === -1 ) {
					pageLinks.push( links[ i ].href );
				}
			}
			return pageLinks;
		}).forEach( function( value ) {

			// Iterate of the new links returned
			// If the reverse lookup does not already have this link add it
			if ( !linkObject[ value ] ) {
				linkObject[ value ] = [];
			}

			// Add the current page to the reverse lookup for the current link
			linkObject[ value ].push( url );

			// If the links is not already in the links array add it
			if ( links.indexOf( value ) === -1 ) {

				// If this is a hash link to the current page push the links to be next in
				// line to avoid extra requests otherwise push it to the end
				if ( new RegExp( url + "#" ).test( value ) ) {
					links.splice( currentIndex + 1, 0, value );
				} else {
					links.push( value );
				}
			}
		});

		// Move on to the next link
		next();
	});
}

// Kick off the tests
casper.test.begin( "Go Go Spidey Crawl!", 5, function suite( test ) {
	var logDump;

	// Start on the first page
	casper.start( links[ 0 ], function() {
		bindEvents();
		checkPage();
	});

	casper.then(function() {

		// The spider completed with out blowing up PASS!
		test.assert( true, "Spidering successfully completed" );
		// Are we checking script errors?
		if ( check.script ) {

				// If script errors are found echo them out
				if ( errors.script.length > 0 ) {
					this.echo( errors.scriptlength + " Javascript errors found", "WARNING");
					errors.script.forEach( function( value ) {
						echoMessage( value, "ERROR" );
					});
				}

				// The actual test assert
			test.assert( errors.script.length === 0, errors.script.length + " Javascript errors found" );
		}
	});

	[ "client", "redirect" ].forEach( function( type ) {
		var count = 0;

		if ( check[ type ] ) {
			casper.then(function(){
				test.assert( errors[ type ].length === 0,  errors[ type ].length + " Total " + type + " errors found" );
			}).then(function(){
				var that = this;

				if ( errors[ type ].length > 0 ) {
					that.echo( errors[ type ].length + " unique " + type + " errors found", "ERROR" );
					errors[ type ].forEach( function( error, index ) {
						var currentCount = 0,
							sourcePages = linkObject[ error.url ] || linkObject[ error.sourceUrl ];

						count += sourcePages.length;

						that.echo( "Link - " + ( index + 1 ), "INFO" );
						echoMessage( error, true );
						that.echo( "    Linked from: ", "DEBUG" );

						sourcePages.some( function( page ) {
							currentCount++;
							that.echo( "\t" + page.substring( 0, 100 ), "DEBUG" );
							if ( currentCount > 9 && !casper.options.verbose ) {
								return true;
							}
						});
					});
					that.echo( count + " Total " + type + " errors found", "WARNING" );
				}
			});
		}
	});

	casper.then(function(){
		var that = this;

		if ( check.resource ) {
			if ( errors.resource.length > 0 ) {
				this.echo( errors.resource.length + " resource errors found", "WARNING" );
				errors.resource.forEach( function( value ) {
					that.echo( "ERROR: " + value.errorCode + " - " +
						value.errorString, "WARNING" );
					that.echo( "ERROR: " + value.url + " requested by " + value.requestedBy );
				});
			} else {
				this.echo( errors.resource.length + " resource errors ", "INFO");
			}
			if ( !!output ) {
				logs.forEach( function( value ) {
					logDump += value + "\n";
				});
				casper.echo( "Saving logs in " + output );

				fs.write( output, logDump, "w" );
			}
			test.assert( errors.resource.length === 0, errors.resource.length + " resource errors found" );
		}
	});

	casper.run(function(){
		this.echo( links.length + " Total links found", "ERROR" );
		test.done();
	});
});
