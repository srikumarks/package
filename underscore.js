// A "packaged" version of Underscore that doesn't
// pollute the global namespace with a "_".
// 
// WARNING: Not intended for use directly within
// a browser. More for use when building a minified
// application.
package.fetch('https://raw.github.com/documentcloud/underscore/master/underscore.js',
        function (package, url, source) {
            package('underscore', 
                eval('(function () {\n' 
                    + 'var module = {exports: {}}, exports = module.exports;\n'
                    + 'return (function () {\n'
                        + source
                        + '\nreturn this["_"] || module.exports;\n'
                        + '}).call({});\n'
                    + '})\n'));       
        });

