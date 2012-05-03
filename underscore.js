// A "packaged" version of Underscore that doesn't
// pollute the global namespace with a "_".
// The "underscore-1.3.3.js" file needs to co-exist
// with this package in this build directory.
// 
// WARNING: Not intended for use directly within
// a browser. More for use when building a minified
// application.
_package('Underscore', ['#global'], 
        eval('(function (__window__) {\n' 
            + 'return (function () {\n'
            + _package.fetch('underscore-1.3.3.js')
            + '\nreturn this["_"];\n'
            + '}).call(Object.create(__window__));\n'
            + '})\n'));
