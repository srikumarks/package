// Given a number of files, scans them and generates _package.config declarations
// for the packages in those files. Also takes into account any configuration
// information declared explicitly in them.
//
// Run like this -
//
// node configure.js file1.js file2.js ... > pkgmap.js
// node build.js pkgmap.js main.js > concatted.js
// minify concatted.js > main.min.js

function _package(name) {
    _package.__configurations__[name] = {path: _package.__PATH__};
}

_package.__configurations__  = {}

_package.config = function (cfg) {
    Object.keys(cfg).forEach(function (k) {
        if (_package.__configurations__.hasOwnProperty(k) 
                && JSON.stringify(_package.__configurations__[k]) !== JSON.stringify(cfg[k])) {
            console.error("Package [" + k + "] has conflicting configuration!");
            console.error("\tPrevious: " + JSON.stringify(_package.__configurations__[k]));
            console.error("\tNew: " + JSON.stringify(cfg[k]));
            throw "Aborted";
        } else {
            _package.__configurations__[k] = cfg[k];
        }
    });
};

if (process.argv.length <= 2) {
    process.stderr.write('Usage: node configure file1.js file2.js ...\n');
    process.stderr.write("Will generate a _package.config() declaration for all the packages\n");
    process.stderr.write("found in the given files to stdout. The order of the files is irrelevant,\n");
    process.stderr.write("so you don't need to know the package dependencies in advance. Just make\n");
    process.stderr.write("the generated configuration the first file you provide to the build.js.\n");
} else {
    process.argv.slice(2).forEach(function (arg, i, argv) {
        _package.__PATH__ = arg;
        eval('(function (_package) {\n' + require('fs').readFileSync(arg, 'utf8') + '\n})')(_package);
    });

    process.stdout.write('_package.config(' + JSON.stringify(_package.__configurations__, null, 4) + ');\n');
}
