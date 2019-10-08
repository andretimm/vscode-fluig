const gulp = require('gulp');
const path = require('path');
const ts = require('gulp-typescript');
const log = require('gulp-util').log;
const typescript = require('typescript');
const sourcemaps = require('gulp-sourcemaps');
const tslint = require('gulp-tslint');
const nls = require('vscode-nls-dev');
const del = require('del');
const fs = require('fs');
const vsce = require('vsce');
const es = require('event-stream');
const minimist = require('minimist');

const lintSources = [
    'src'
].map(tsFolder => tsFolder + '/**/*.ts');

const tsProject = ts.createProject('tsconfig.json', { typescript });

function doBuild(buildNls, failOnError) {
    return () => {
        let gotError = false;
        const tsResult = tsProject.src()
            .pipe(sourcemaps.init())
            .pipe(tsProject())
            .once('error', () => {
                gotError = true;
            });

        return tsResult.js
            .pipe(buildNls ? nls.rewriteLocalizeCalls() : es.through())
            .pipe(buildNls ? nls.bundleMetaDataFiles('ms-vscode.totvs-developer-studio', 'src') : es.through())
            .pipe(buildNls ? nls.bundleLanguageFiles() : es.through())
            .pipe(sourcemaps.write('.', { includeContent: false, sourceRoot: '..' })) // .. to compensate for TS returning paths from 'out'
            .pipe(gulp.dest('out'))
            .once('error', () => {
                gotError = true;
            })
            .once('finish', () => {
                if (failOnError && gotError) {
                    process.exit(1);
                }
            });
    };
}

gulp.task('clean', () => {
    return del(['out/**', 'package.nls.*.json', 'vs-fluig-*.vsix']);
});

gulp.task('copy-scripts', () => {
    return gulp
        .src(scripts, { base: '.' })
        .pipe(gulp.dest('out'));
});

gulp.task('_build', gulp.series( doBuild(true, true)));

gulp.task('build', gulp.series('clean', '_build'));

gulp.task('tslint', () => {
    return gulp.src(lintSources, { base: '.' })
        .pipe(tslint({
            formatter: 'verbose'
        }))
        .pipe(tslint.report());
});

function verifyNotALinkedModule(modulePath) {
    return new Promise((resolve, reject) => {
        fs.lstat(modulePath, (err, stat) => {
            if (stat.isSymbolicLink()) {
                reject(new Error('Symbolic link found: ' + modulePath));
            } else {
                resolve();
            }
        });
    });
}

function verifyNoLinkedModules() {
    return new Promise((resolve, reject) => {
        fs.readdir('./node_modules', (err, files) => {
            Promise.all(files.map(file => {
                const modulePath = path.join('.', 'node_modules', file);
                return verifyNotALinkedModule(modulePath);
            })).then(resolve, reject);
        });
    });
}

gulp.task('verify-no-linked-modules', cb => verifyNoLinkedModules().then(() => cb, cb));

gulp.task('vsce-publish', () => {
    return vsce.publish();
});
gulp.task('vsce-package', () => {
    const cliOptions = minimist(process.argv.slice(2));
    const packageOptions = {
        packagePath: cliOptions.packagePath
    };

    return vsce.createVSIX(packageOptions);
});

gulp.task('publish', gulp.series('build', 'vsce-publish'));

gulp.task('package', gulp.series('build', 'vsce-package'));
