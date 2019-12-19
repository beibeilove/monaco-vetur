/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

var gulp = require('gulp');
var tsb = require('gulp-tsb');
var assign = require('object-assign');
var fs = require('fs');
var path = require('path');
var merge = require('merge-stream');
var rjs = require('gulp-requirejs');
var uglify = require('gulp-uglify');
var rimraf = require('rimraf');
var es = require('event-stream');
var httpServer = require('http-server');

gulp.task('clean-release', function(cb) { rimraf('release', { maxBusyTries: 1 }, cb); });
gulp.task('release', ['clean-release','compile'], function() {

	var sha1 = getGitVersion(__dirname);
	var semver = require('./package.json').version;
	var headerVersion = semver + '(' + sha1 + ')';

	function getDependencyLocation(name, libLocation, container) {
		var location = __dirname + '/node_modules/' + name + '/' + libLocation;
		if (!fs.existsSync(location)) {
			var oldLocation = __dirname + '/node_modules/' + container + '/node_modules/' + name + '/' + libLocation;
			if (!fs.existsSync(oldLocation)) {
				console.error('Unable to find ' + name + ' node module at ' + location + ' or ' + oldLocation);
				return;
			}
			return oldLocation;
		}
		return location;
	}

	var uriLocation = getDependencyLocation('vscode-uri', 'lib', 'vscode-html-languageservice');

	function bundleOne(moduleId, exclude) {


		return rjs({
			baseUrl: '/out/',
			name: 'vs/language/vue/' + moduleId,
			out: moduleId + '.js',
			exclude: exclude,
			paths: {
				'vs/language/vue':  __dirname + '/out'
			},
			packages: [{
				name: 'vscode-html-languageservice',
				location: __dirname + '/node_modules/vscode-html-languageservice/lib',
				main: 'htmlLanguageService'
            }, {
                name: 'vscode-languageserver-types',
                location: __dirname + '/node_modules/vscode-languageserver-types/lib',
                main: 'main'
            }, {
				name: 'vscode-css-languageservice',
				location: __dirname + '/node_modules/vscode-css-languageservice/lib',
				main: 'cssLanguageService'
			}, {
				name: 'vscode-uri',
				location: uriLocation,
				main: 'index'
			}, {
				name: 'vscode-nls',
				location: __dirname + '/out/fillers',
				main: 'vscode-nls'
			}]
		})
    }

	return merge(
		merge(
            bundleOne('monaco.contribution', ['vs/language/vue/vueMode']),
            bundleOne('lib/typescriptServices'),
			bundleOne('vueMode', ['vs/language/vue/lib/typescriptServices']),
			bundleOne('vueWorker', ['vs/language/vue/lib/typescriptServices'])
			// bundleOne('htmlMode'),
			// bundleOne('htmlWorker')
		)
		.pipe(es.through(function(data) {
			data.contents = new Buffer(
				data.contents.toString()
			);
			this.emit('data', data);
        }))
		.pipe(gulp.dest('./release/dev'))
		.pipe(uglify({
			preserveComments: function(node, token) {
				var text = token.value;
				if (text.indexOf('monaco-vue version') >= 0) {
					// this is the main copyright header
					return true;
				}
				if (text.indexOf('Copyright (c) Microsoft') >= 0) {
					// this is another Microsoft copyright header (not the main)
					return false;
				}
				if (/copyright/i.test(text)) {
					return true;
				}
				return false;
			}
		}))
		.pipe(gulp.dest('./release/min')),
		gulp.src('src/monaco.d.ts').pipe(gulp.dest('./release/min'))
	);
});


var compilation = tsb.create(assign({ verbose: true }, require('./src/tsconfig.json').compilerOptions));

var tsSources = 'src/**/*.ts';

function compileTask() {
	return merge(
		gulp.src('src/lib/**/*.js', { base: './src' }),
		gulp.src(tsSources).pipe(compilation())
	)
	.pipe(gulp.dest('out'));
}

gulp.task('clean-out', function(cb) { rimraf('out', { maxBusyTries: 1 }, cb); });
gulp.task('compile', ['clean-out'], compileTask);
gulp.task('compile-without-clean', compileTask);
gulp.task('watch', ['compile'], function() {
	gulp.watch(tsSources, ['compile-without-clean']);
});
gulp.task('simpleserver', function(cb) {
	httpServer.createServer({ root: './', cache: 5 }).listen(4000);
	// httpServer.createServer({ root: './', cache: 5 }).listen(8088);
	console.log('Server address: http://127.0.0.1:4000/');
});


/**
 * Escape text such that it can be used in a javascript string enclosed by double quotes (")
 */
function escapeText(text) {
	// http://www.javascriptkit.com/jsref/escapesequence.shtml
	// \b	Backspace.
	// \f	Form feed.
	// \n	Newline.
	// \O	Nul character.
	// \r	Carriage return.
	// \t	Horizontal tab.
	// \v	Vertical tab.
	// \'	Single quote or apostrophe.
	// \"	Double quote.
	// \\	Backslash.
	// \ddd	The Latin-1 character specified by the three octal digits between 0 and 377. ie, copyright symbol is \251.
	// \xdd	The Latin-1 character specified by the two hexadecimal digits dd between 00 and FF.  ie, copyright symbol is \xA9.
	// \udddd	The Unicode character specified by the four hexadecimal digits dddd. ie, copyright symbol is \u00A9.
	var _backspace = '\b'.charCodeAt(0);
	var _formFeed = '\f'.charCodeAt(0);
	var _newLine = '\n'.charCodeAt(0);
	var _nullChar = 0;
	var _carriageReturn = '\r'.charCodeAt(0);
	var _tab = '\t'.charCodeAt(0);
	var _verticalTab = '\v'.charCodeAt(0);
	var _backslash = '\\'.charCodeAt(0);
	var _doubleQuote = '"'.charCodeAt(0);

	var startPos = 0, chrCode, replaceWith = null, resultPieces = [];

	for (var i = 0, len = text.length; i < len; i++) {
		chrCode = text.charCodeAt(i);
		switch (chrCode) {
			case _backspace:
				replaceWith = '\\b';
				break;
			case _formFeed:
				replaceWith = '\\f';
				break;
			case _newLine:
				replaceWith = '\\n';
				break;
			case _nullChar:
				replaceWith = '\\0';
				break;
			case _carriageReturn:
				replaceWith = '\\r';
				break;
			case _tab:
				replaceWith = '\\t';
				break;
			case _verticalTab:
				replaceWith = '\\v';
				break;
			case _backslash:
				replaceWith = '\\\\';
				break;
			case _doubleQuote:
				replaceWith = '\\"';
				break;
		}
		if (replaceWith !== null) {
			resultPieces.push(text.substring(startPos, i));
			resultPieces.push(replaceWith);
			startPos = i + 1;
			replaceWith = null;
		}
	}
	resultPieces.push(text.substring(startPos, len));
	return resultPieces.join('');
}

function getGitVersion(repo) {
	var git = path.join(repo, '.git');
	var headPath = path.join(git, 'HEAD');
	var head;

	try {
		head = fs.readFileSync(headPath, 'utf8').trim();
	} catch (e) {
		return void 0;
	}

	if (/^[0-9a-f]{40}$/i.test(head)) {
		return head;
	}

	var refMatch = /^ref: (.*)$/.exec(head);

	if (!refMatch) {
		return void 0;
	}

	var ref = refMatch[1];
	var refPath = path.join(git, ref);

	try {
		return fs.readFileSync(refPath, 'utf8').trim();
	} catch (e) {
		// noop
	}

	var packedRefsPath = path.join(git, 'packed-refs');
	var refsRaw;

	try {
		refsRaw = fs.readFileSync(packedRefsPath, 'utf8').trim();
	} catch (e) {
		return void 0;
	}

	var refsRegex = /^([0-9a-f]{40})\s+(.+)$/gm;
	var refsMatch;
	var refs = {};

	while (refsMatch = refsRegex.exec(refsRaw)) {
		refs[refsMatch[2]] = refsMatch[1];
	}

	return refs[ref];
}