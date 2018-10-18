"use strict";
const fs = require("file-system");
const path = require("path");

module.exports = bundler => {
    bundler.on("bundled", bundle => {
        let pkgFile;
        if(typeof bundler.mainBundle.entryAsset.getPackage === 'function') {
            // for parcel-bundler@>=1.9
            pkgFile = Promise.resolve(bundler.mainBundle.entryAsset.getPackage());
        } else {              
            if (bundler.mainAsset &&
                bundler.mainAsset.package &&
                bundler.mainAsset.package.pkgfile) {
                // for parcel-bundler version@<1.8
                pkgFile = require(bundler.mainAsset.package.pkgfile);
            } else {
                // for parcel bundler@1.8
                pkgFile = bundler.mainBundle.entryAsset.package;
            }
        }

        const copyDir = (staticDir, bundleDir) => {
            console.log('copyDir: staticDir', staticDir, 'bundleDir', bundleDir);
            if (fs.existsSync(staticDir)) {
                const copy = (filepath, relative, isFile) => {
                    const dest = filepath.replace(staticDir, bundleDir);
                    // console.log('filepath', filepath, 'dest', dest);
                    if (!isFile) {
                        // if it's a folder, make it
                        fs.mkdir(filepath, dest);
                    } else {
                        const copyInner = () => {
                            console.log('filepath', filepath, 'dest', dest);
                            fs.copyFile(filepath, dest);
                        };
                        if (fs.existsSync(dest)) {
                            const destStat = fs.statSync(dest);
                            const srcStat = fs.statSync(filepath);
                            if (destStat.mtime <= srcStat.mtime) { // File was modified - let's copy it and inform about overwriting.
                                console.info(`Info: Static file '${filepath}' do already exist in '${bundleDir}'. Overwriting.`);
                                copyInner()
                            }
                        } else {
                            copyInner()
                        }
                    }
                };
                fs.recurseSync(staticDir, copy);
            } else {
                console.warn(`Warning: Static directory '${staticDir}' do not exist. Skipping.`);
            }
        };
        const processPkgFile = pkgFile => {
            // Get 'staticPath' from package.json file
            const staticDir = pkgFile.staticPath || "static";
            const bundleDir = path.dirname(bundle.name);
            if (Array.isArray(staticDir)) {
                for(let dir of staticDir) {
                    copyDir(dir, bundleDir);
                }
            } else {
                copyDir(staticDir, bundleDir);
            }
        };
        if (typeof pkgFile.then === 'function') {
            pkgFile.then(processPkgFile);
        } else {
            processPkgFile(pkgFile);
        }
    });
};
