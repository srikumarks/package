// A "packaged" version of Backbone that doesn't
// pollute the global namespace with a "Backbone".
// 
// WARNING: Not intended for use directly within
// a browser. More for use when building a minified
// application.
package.fetch('https://raw.github.com/documentcloud/backbone/master/backbone.js',
        function (package, url, source) {
            package('backbone',
                eval('(function () {\n' 
                    + 'var module = {exports: {}}, exports = module.exports;\n'
                    + 'return (function () {\n'
                        + source
                        + '\nreturn this["Backbone"] || module.exports;\n'
                        + '}).call({});\n'
                    + '})\n'));
        });
