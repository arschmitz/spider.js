/*global casper: false */
var url,
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
		resource: []
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
function echoMessage( message ) {
	for ( var key in message ) {
		casper.echo( key + ": " + message[ key ], format[ key ] );
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
				file: "file: " + trace[0] ? trace[0].file : "Not Available",
				line: "line: " + trace[0] ? trace[0].line : "Not Available",
				functionCall: "function: " + trace[0] ? trace[0][ "function "] : "Not Available"
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

	// Open the page
	casper.open( url ).then( function() {

		// If this is an external page stop here and go to the next one no need to crawl
		if ( !checkInternal( url ) ) {
			if ( casper.options.verbose ) {
				casper.echo( "External Page: " + url );
			}
			next();
			return;
		}
		if ( casper.options.verbose ) {
			// echo the current page and that its internal
			casper.echo( "Internal Page: " + url, "warning" );
		}

		// Check if the current page already has jQuery
		var hasjquery = this.evaluate(function() {
				return ( typeof jQuery !== "undefined" );
			});

		// If it does not have jQuery try and inject it
		// If this fails log it and move on to the next link
		if ( !hasjquery && !casper.page.injectJs( "node_modules/jquery/dist/jquery.min.js" ) ) {
			this.echo( "jQuery Injection Failed - Page skipped", "WARNING" );
			next();
			return;
		}

		// Evaluate the page to return a list of unique links
		this.evaluate( function() {
			var pageLinks = [];
			jQuery( "a").each( function() {
				var href = jQuery( this )[0].href;
				if ( jQuery.inArray( href, pageLinks) === -1 ) {
					pageLinks.push( href );
				}
			});
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
casper.test.begin( "Go Go Spidey Crawl!", function suite( test ) {

	// Start on the first page
	casper.start( links[ 0 ], function() {
		bindEvents();
		checkPage();
	});
	casper.run(function() {
		test.done();
	});
});

if ( check.script ) {
	casper.test.begin( "There are no errors or warnings", 1, function suite( test ) {
		casper.run(function() {

			// If script errors are found echo them out
			if ( errors.script.length > 0 ) {
				this.echo( errors.scriptlength + " Javascript errors found", "WARNING");
				errors.script.forEach( function( value ) {
					echoMessage( value, "ERROR" );
				});
			} else {
				this.echo(errors.script.length + " Javascript errors found", "INFO");
			}

			// The actual test assert
			test.assert( errors.script.length === 0, "No JS errors found" );
			test.done();
		});
	});
}
[ "client", "redirect" ].forEach( function( type ) {
	if ( check[ type ] ) {
		casper.test.begin( "There are no " + type + " errors", 1, function suite( test ) {
			casper.run( function() {
				if ( errors[ type ].length > 0 ) {
					this.echo( errors[ type ].length + " unique " + type +
						" errors found", "WARNING" );
					var that = this,
						count = 0;
					errors[ type ].forEach( function( error, index ) {
						casper.echo( "Link - " + ( index + 1 ), "INFO" );
						echoMessage( error, "DEBUG" );
						var currentCount = 0,
							sourcePages = linkObject[ error.url ] || linkObject[ error.sourceUrl ];

						count += sourcePages.length;
						that.echo( "Linked from: ", "DEBUG" );
						sourcePages.some( function( page ) {
							currentCount++;
							that.echo( page.substring( 0, 100 ), "DEBUG" );
							if ( currentCount > 9 ) {
								return true;
							}
						});
					});
					this.echo( count + " Total " + type + " errors found", "WARNING" );
				} else {
					this.echo( errors[ type ].length + " " + type + " errors found", "INFO" );
				}
				test.assert( errors.client.length === 0, "No " + type + " errors found" );
				test.done();
			});
		});
	}
});

if ( check.resource ) {
	casper.test.begin( "All resource load properly", 1, function suite( test ) {
		casper.run( function() {
			var that = this,
				logDump,
				fs = require( "fs" );
			if (errors.resource.length > 0) {
				this.echo( errors.resource.length + " resource errors found", "WARNING" );
				errors.resource.forEach( function( value ) {
					that.echo( "ERROR: " + value.errorCode + " - " +
						value.errorString, "WARNING" );
					that.echo( "ERROR: " + value.url + " requested by " + value.requestedBy );
				});
			} else {
				this.echo( errors.resource.length + " resource errors found", "INFO");
			}
			this.echo( links.length + (links.length === 1 ? " link" : " links") + " found", "ERROR" );
			if ( !!output ) {
				logs.forEach( function( value ) {
					logDump += value + "\n";
				});
				casper.echo( "Saving logs in " + output );

				fs.write( output, logDump, "w" );
			}
			test.assert( errors.resource.length === 0, "All resource loaded" );
			test.done();
		});
	});
}
