// A "packaged" version of Backbone that doesn't
// pollute the global namespace with a "Backbone".
// The "backbone-0.9.2.js" file needs to co-exist
// with this package in this build directory.
// 
// WARNING: Not intended for use directly within
// a browser. More for use when building a minified
// application.
_package('backbone', 
        eval('(function () {\n' 
            + 'var module = {exports: {}}, exports = module.exports;\n'
            + 'return (function () {\n'
            + _package.fetch('lib/backbone-0.9.2.js')
            + '\nreturn this["Backbone"] || module.exports;\n'
            + '}).call({});\n'
            + '})\n'));
