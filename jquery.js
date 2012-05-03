// A "packaged" version of jQuery that doesn't
// pollute the global namespace with a "$".
// The "jquery-1.7.2.js" file needs to co-exist
// with this package in this the build directory.
// 
// WARNING: Not intended for use directly within
// a browser. More for use when building a minified
// application.
_package('jquery', ['#global'], 
        eval('(function (__window__) {\n' 
            + 'var window = Object.create(__window__);\n'
            + _package.fetch('lib/jquery-1.7.2.js')
            + '\nreturn window.$; })'));
