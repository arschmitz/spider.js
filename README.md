[![NPM version](https://badge.fury.io/js/spider.js.png)](https://www.npmjs.com/package/spider.js)


# spider.js
#### A node module and command line tool for crawling a website for dead links, permanent and or fatal redirects, resource load issues, and script errors. It is based on the casperJS navigation scripting and testing utility.

## Usage


#### Node Module
```js
var spider = require( "spider.js" );

spider( options );
```

#### Command line
```
spiderjs --url=http://example.com [, option1 ] [, option2 ]
```

## Examples


#### Node Module
```js
var spider = require( "spider.js" );

spider( {
	url: "http://example.com",
	ignore: "error.html",
	redirectError: false
} );
```

#### Command line
```
spiderjs --url=http://example.com --ignore=error.html --redirectError=false
```

## Options

#### url ( Required )
Type: `String`
Default value: `'http://localhost'`

a valid url for a website. The url willThis url may be local or remote.

#### ignore
Type: `String`
Default value: `''`

A string that will be used to create a regex for excluding urls from being spidered.
#### output
Type: `String`
Default value: `false`

A file to output test log and results too

#### clientError
Type: `Boolean`
Default value: `true`

Wether or not to check 4XX Errors

#### redirectError
Type: `Boolean`
Default value: `true`

Wether or not to check 3XX Errors

#### resourceError
Type: `Boolean`
Default value: `true`

Wether or not to check resource Errors

#### scriptError
Type: `Boolean`
Default value: `true`

Wether or not to check script Errors

#### linkOutputLimit
Type: `Number`
Default value: `10`

The maximum number of pages to show per link. This helps to prevent excessive output when a link exists on every page of a site like in a header or footer.