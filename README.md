[![NPM version](https://badge.fury.io/js/spider.js.png)](https://www.npmjs.com/package/spider.js)


# spider.js
#### A command line tool for crawling a webstite for dead links, permeant and or fatal redirects, resource load issues, and script errors. It is based on the casperJS navigation scripting and testing utility.

## Usage

```
spiderjs --url=http://example.com [ options ]
```

## Command line options

#### --url ( Required )
Type: `String`
Default value: `'http://localhost'`

a valid url for a website. The url willThis url may be local or remote.


#### --ignore
Type: `String`
Default value: `''`

A string that will be used to create a regex for excluding urls from being spidered.
#### --output
Type: `String`
Default value: `False`

A file to output test log and results too

#### --clientError
Type: `Boolean`
Default value: `True`

Wether or not to check 4XX Errors

#### --redirectError
Type: `Boolean`
Default value: `True`

Wether or not to check 3XX Errors

#### --resourceError
Type: `Boolean`
Default value: `True`

Wether or not to check resource Errors

#### --scriptError
Type: `Boolean`
Default value: `True`

Wether or not to check script Errors