// A "packaged" version of jQuery that doesn't
// pollute the global namespace with a "$".
// Directly pulls the jquery library from the published
// URL .. both when used within the browser as well
// as when using 'build'.
// 
// WARNING: Not intended for use directly within
// a browser. More for use when building a minified
// application.
package.fetch('http://code.jquery.com/jquery-1.7.2.js', 
        function (package, url, source) {
            package('jquery', ['#global'], 
                eval('(function (__window__) {\n'
                     + 'var window = Object.create(__window__);\n'
                     + source
                     + '\nreturn window.$; })'));
        });
