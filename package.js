// Copyright (c) 2012, Srikumar K. S.
// Licensed for use and redistribution under the MIT license.
// See http://www.opensource.org/licenses/mit-license.php
//
// Simple global namespace package manager.
// Java style packages.
// Usage: 
//  Package names are in the reverse dns form 
//  - ex: "com.nishabdam.sample-manager".
//
// Functions:
//  package(name) -> 
//      Returns the currently loaded package of the given name.
//  package(name, definition) -> 
//      "definition" is a function that is called. The
//      return value of the function gives the package object. If definition itself
//      is an object, then it becomes the package value directly.
//  package(name, dependencies, definition) ->
//      "dependencies" is an array. This causes all the dependencies to
//      be loaded first. Once that is done, the definition function is
//      called with an argument list corresponding to the given array
//      of dependencies.
//
//  Utilities:
//   package.aliases({ name1: "com.blah.bling.SophisticatedName1", ...});
//      Defines aliases for long package names. The aliases are global.
//
//   package.config({
//      "com.where.packageName": { url: "where/dir/file.js", alias: "name" },
//      ...
//   })
//      The url can refer to a relative path or an absolute url.
//      If the 'url' key is specified instead of 'path', then the package
//      is fetched using http, even in Node.js environment.

(function (package) {
    try {
        module.exports = package;
        global.package = package;
    } catch (e) {
    }

    try {
        window["package"] = package;
    } catch (e) {
    }
}((function () {

    var the_global_object;

    try {
        window.document;
        the_global_object = window;
    } catch (e) {
    }
    try {
        global.require;
        the_global_object = global;
    } catch (e) {
    }

    var packages = {};
    // Maps package names of the form "com.blah.bling" to package objects a.k.a. "modules".

    var loading = {};
    // Every package that has started loading, but hasn't finished yet
    // will have its package name registered here.

    var onloads = {};
    // Maps complete package names to an array of callbacks to be called when the
    // package finished loading. The callbacks all take the package object as a
    // single parameter.

    var config = {};
    // Maps full package names to objects of the form -
    //      { path: "path/to/package/file.js"
    //      , url: "http://somewhere.com/somefile.js"  // Overrides 'path'
    //      , alias: "shortname"
    //      }

    var loadOrder = {};
    // Maps package name to number indicating when it was loaded.

    var aliases = {}; // Maps short names to full package names.

    // Valid package names are those that are not any of
    // the builtin members of Function objects in JS,
    // which includes raw objects as well. This excludes
    // stuff like 'constructor', 'toString', etc. as package
    // names. It returns the name if valid, throws an exception
    // if not valid.
    var validPkgName = (function () {
        function checkComponent(n) {
            if (checkComponent[n]) {
                throw new Error('Invalid package component name [' + n + ']');
            } else {
                return n;
            }
        }
        return function (n) {
            return n.split('.').map(checkComponent).join('.');
        };
    }());

    // Gets path specified in config, or derives a path
    // from the package name by replacing '.' with '/'.
    function packagePath(name) {
        if (name in config) {
            return config[name].path;
        } else {
            return name.replace(/\./g, '/') + '.js';
        }
    }

    // Returns url if absolute one is specified.
    function packageURL(name) {
        var cfg = config[name];
        if (cfg && cfg.url && /^https?:\/\//.test(cfg.url)) {
            return cfg.url;
        } else {
            return null;
        }
    }

    function knownPackage(name) {
        return packages[name] || (name === '#global' ? the_global_object : undefined);
    }

    function trueName(name) {
        if (/^\./.test(name)) {
            name = package.__parent + name;
        }
        return name in aliases ? aliases[name] : name;
    }

    function pseudoPackage(name) {
        return name.charAt(0) === '#';
    }

    function definePackageFromSource(name, source) {
        loadConfig(name);
        var closure = eval('(function (package, __pkgname__) {\n' + source + ';\n})');
        closure(package, name);
        return packages[name];
    }

    // Inside a package definition function, "this"
    // refers to the current package object so you can
    // setup exports by assigning properties to the
    // "this" object. If you don't have a return statement
    // in the package definition function, or you return 
    // 'undefined', the this object will be used as the
    // package definition. Otherwise the return value will
    // be used.
    function defWithFallback(pkg, definition, dependencies) {
        var p = definition.apply(pkg, dependencies);
        return p === undefined ? pkg : p;
    }

    function definePackage(name, definition, dependencies) {
        package.__parent = name.replace(/\.[^\.]+$/, '');
        var p = packages[name] || {};
        packages[name] = p;
        packages[name] = (definition.constructor === Function 
                ? defWithFallback(p, definition, dependencies)
                : definition);
        return onPackageLoaded(name);
    }

    function addOnLoad(name, callback) {
        if (name in onloads) {
            onloads[name].push(callback);
        } else {
            onloads[name] = [callback];
        }
    }

    var delay = (function () {
        try {
            return process.nextTick;
        } catch (e) {
            return function (proc) { setTimeout(proc, 0); };
        }
    }());

    function with_package_in_browser(name, callback) {
        // Expected to be loaded.
        var p = knownPackage(name);
        if (p) {
            // Package already loaded.
            delay(function () { callback(p); });
        } else if (loading[name]) {
            // Package started loading already.
            addOnLoad(name, callback);
        } else {
            // Need to load package.
            loading[name] = true;
            addOnLoad(name, callback);
            if (!pseudoPackage(name)) {
                var script = document.createElement('script');
                script.setAttribute('src', packagePath(name));
                document.head.insertAdjacentElement('beforeend', script);
            }
        }
    }

    function with_package_in_fs(name, callback) {
        var p = knownPackage(name);
        var source, closure, where;
        if (p) {
            // Package loaded already.
            delay(function () { callback(p); });
        } else if (loading[name]) {
            // Package started loading already.
            addOnLoad(name, callback);
        } else {
            // Need to load package.
            loading[name] = true;
            addOnLoad(name, callback);
            if (!pseudoPackage(name)) {
                where = packageURL(name);
                if (where) {
                    loadPackageFromURL(name, where);
                } else {
                    where = packagePath(name);
                    loadPackageFromDisk(name, where);
                }
            }
        }
    }

    function fetch_url_sync_in_browser(url) {
        var req = new XMLHttpRequest();
        req.open('GET', url, false);
        req.send();
        if (req.status === 200) {
            return req.responseText;
        } else {
            throw "Module path [" + url + "] not found.";
        }
    }

    function fetch_url_sync_from_fs(where) {
        return require('fs').readFileSync(where, 'utf8');
    }

    var with_package, fetch;
    try {
        if (window.navigator) {
            // In browser
            with_package = with_package_in_browser;
            fetch = fetch_url_sync_in_browser;
        }
    } catch (e) {
        // In Node.js
        with_package = with_package_in_fs;
        fetch = fetch_url_sync_from_fs;
    }

    function loadPackageFromURL(name, url) {
        require('http').get(require('url').parse(url), function (res) {
            var source = "";
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                source += chunk;
            });
            res.on('end', function () {
                package.__CONFIG__ = {url: url};
                definePackageFromSource(name, source);
            });
            res.on('error', function (err) {
                console.error(err);
            });
        }).on('error', function (err) {
            console.error(err);
        });
    }

    var listingPkgSuffix = /\.__listing__$/;
    var listingFileSuffix = /__listing__\.js$/;

    function loadPackageFromDisk(name, where) {
        var fs = require('fs');
        var source, dirLoc, dirContents, parentPkg, subDirs, subDirCount;

        try {
            source = fs.readFileSync(where, 'utf8');
            package.__CONFIG__ = {path: where};
            definePackageFromSource(name, source);
        } catch (e) {
            if (listingPkgSuffix.test(name)) {
                // A listing entry failed. In this case, we can find
                // out the directory contents automatically. So do that.
                dirLoc = where.replace(listingFileSuffix, '');
                dirContents = fs.readdirSync(dirLoc);
                parentPkg = name.replace(listingPkgSuffix, '');
                packages[name] = 
                    dirContents.filter(function (f) { return /\.js$/.test(f); })
                    .map(function (f) { 
                        var fname = f.replace(/\.js$/, ''); 
                        var cfg = {};
                        cfg[parentPkg + '.' + fname] = {path: dirLoc + f};
                        package.config(cfg);
                        return fname;
                    });

                subDirs = dirContents.filter(function (f) {
                    return fs.statSync(where.replace(listingFileSuffix, f)).isDirectory();
                });
                if (subDirs.length === 0) {
                    onPackageLoaded(name);
                } else {
                    subDirCount = 0;
                    // Recursively load sub directories.
                    subDirs.forEach(function (f) {
                        var fname = name.replace(/__listing__$/, f) + '.__listing__';
                        delay(function () {
                            with_package(fname, function (p) {
                                ++subDirCount;
                                if (subDirCount === subDirs.length) {
                                    onPackageLoaded(name);
                                }
                            });
                        });
                    });
                }
            } else {
                console.error("Failed to load package [" + name + "] from [" + where + "]");
                console.error("Current configuration = ");
                console.error(config);
            }
        }
    }

    // If you load a package named 'blah.bling.meow',
    // then you can get the package in a number of ways -
    //      package('blah.bling.meow')
    //      package('blah.bling.*').meow
    //      package('blah.*').bling.meow
    //      package('*').blah.bling.meow
    //  This function sets up all those alternative paths.
    function setPackagePatterns(components, p) {
        var pattern, prefix;
        if (components.length > 1) {
            prefix = components.slice(0, components.length - 1);
            pattern = prefix.join('.') + '.*';
        } else {
            prefix = null;
            pattern = '*';
        }
        
        if (packages[pattern]) {
            packages[pattern][components[components.length - 1]] = p;
        } else {
            (packages[pattern] = {})[components[components.length - 1]] = p;
            if (prefix) {
                setPackagePatterns(prefix, packages[pattern]);
            }
        }
    }

    function onPackageLoaded(name) {
        var p = packages[name];
        var callbacks = onloads[name];
        // Add the package to pattern packages as well.
        var components = name.split('.');
        components[0] = trueName(components[0]);
        setPackagePatterns(components, p);
        delete loading[name];

        // Store the load order so that we can optimize package load
        // sequence.
        loadOrder[name] = package.loadOrder++;

        console.log("package " + name + " loaded");
        if (callbacks && callbacks.length > 0) {
            delete onloads[name];
            callbacks.forEach(function (cb) { 
                delay(function () { 
                    cb(p); 
                }); 
            });
        }
        return p;
    }

    function relativePackagePath(path, pkg) {
        var components = path.split('/');
        // The last component of pkg after the final period is taken
        // as the name of the file, with a js suffix. For example,
        // if pkg is "canine.dog.bowow", then the right hand side
        // of the assignment below will evaluate to "bowow.js".
        components[components.length - 1] = pkg.match(/\.([^\.]+)$/)[1] + '.js';
        return components.join('/');
    }

    function loadConfig(pname) {
        if (!config[pname] && package.__CONFIG__) {
            var cfg = {};
            cfg[pname] = {url: package.__CONFIG__.url, path: package.__CONFIG__.path};
            package.config(cfg);
        }
    }

    function package3(name, dependencies, definition) {
        var depPackages = [];
        var count = 0;
        var pname = trueName(validPkgName(name));

        loadConfig(pname);

        if (dependencies.length > 0) {
            dependencies.forEach(function (dep, i) {
                var tname = trueName(dep);

                function onePkgLoaded(p) {
                    depPackages[i] = p;
                    ++count;
                    if (count === dependencies.length) {
                        definePackage(pname, definition, depPackages);
                    }
                }

                if (/^\.[^\.]+$/.test(dep)) {
                    // Relative package name starting with a period.
                    // Auto expand it.
                    dep = pname.replace(/\.[^\.]+$/, dep);
                    tname = trueName(dep);

                    // IMPORTANT:
                    // If pname has a config and this one doesn't, then
                    // assume it is going to be served up from the same location.
                    // This is an important simplification that lets you omit
                    // parent package prefixes of dependencies.
                    if (config[pname] && !config[tname]) {
                        config[tname] = {};
                        if (config[pname].path) {
                            config[tname].path = relativePackagePath(config[pname].path, dep);
                        }
                        if (config[pname].url) {
                            config[tname].url = relativePackagePath(config[pname].url, dep);
                        }
                    }
                }
                
                if (/\.\*$/.test(tname)) {
                    var listing =  tname.replace(/\*$/, '__listing__');
                    with_package(listing, function (p) {
                        var subPkgs = {};
                        var subPkgCount = 0;
                        p.forEach(function (subPkgName) {
                            with_package(tname.replace(/\*$/, subPkgName), function (sp) {
                                subPkgs[subPkgName] = sp;
                                ++subPkgCount;
                                if (subPkgCount === p.length) {
                                    onePkgLoaded(subPkgs);
                                }
                            });
                        });
                    });
                } else {
                    with_package(tname, onePkgLoaded);
                }
            });
            return undefined;
        } else {
            return definePackage(pname, definition, []);
        }
    }

    function package2(name, definition) {
        var tname = trueName(validPkgName(name));
        loadConfig(tname);
        return definePackage(tname, definition, []);
    }

    function package1(name) {
        name = trueName(validPkgName(name));
        return packages[name] || definePackageFromSource(name, 
                                    fetch(packageURL(name) || packagePath(name)));
    }

    function package() {
        switch (arguments.length) {
            case 1: return package1(arguments[0]);
            case 2: return package2(arguments[0], arguments[1]);
            case 3: return package3(arguments[0], arguments[1], arguments[2]);
            default: throw "Invalid number of arguments.";
        }
    }

    function defAlias(name, p) {
        validPkgName(name);
        validPkgName(p);
        aliases[name] = p;
        var pobj = packages[p];
        if (pobj) {
            packages[name] = pobj;
            onPackageLoaded(name);
        } else {
            addOnLoad(p, function (pobj) {
                packages[name] = pobj;
                onPackageLoaded(name);
            });
        }
    }

    package.config = function (setupInfo) {
        var i;
        for (var p in setupInfo) {
            i = config[p] = setupInfo[p];
            i.alias && defAlias(i.alias, p);
        }
    };

    package.aliases = function (name2package) {
        for (var a in name2package) {
            defAlias(a, name2package[a]);
        }
    };

    package.fetch = fetch;

    package.declare = function (packagesThatWillBeDefined) {
        packagesThatWillBeDefined.forEach(function (pname) {
            var pnameres = trueName(pname);
            if (!knownPackage(pnameres)) {
                loading[pname] = true;
                loading[pnameres] = true;
            }
        });
    };

    package.loadOrder = 1;

    return package;
}())));
