// A "packaged" version of Underscore that doesn't
// pollute the global namespace with a "_".
// The "underscore-1.3.3.js" file needs to co-exist
// with this package in this build directory.
// 
// WARNING: Not intended for use directly within
// a browser. More for use when building a minified
// application.
_package('underscore', 
        eval('(function () {\n' 
            + 'var module = {exports: {}}, exports = module.exports;\n'
            + 'return (function () {\n'
            + _package.fetch('underscore-1.3.3.js')
            + '\nreturn this["_"] || module.exports;\n'
            + '}).call({});\n'
            + '})\n'));
