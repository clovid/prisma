/**
 * Dependencies
 */

// Gulp
const { series, parallel, src, dest, watch } = require('gulp');
const del = require('del');

// Basic gulp actions
const naturalSort = require('gulp-natural-sort');
const concat = require('gulp-concat');
const angularFilesort = require('gulp-angular-filesort');

// Minifiy assets
const uglify = require('gulp-uglify');
const postcss = require('gulp-postcss');

// Cache-busting
const rev = require('gulp-rev');

// Error handling
const plumber = require('gulp-plumber');
const notify = require('gulp-notify');

/**
 * Configuration
 */

var paths = {
	public: 'public/',
	scripts: {
		local: [
			'angular/main.js',
			'angular/**/*.js'
		],
		vendor: [
			// jquery, load before angular!
			'node_modules/jquery/dist/jquery.js',
			'node_modules/hamsterjs/hamster.js',
			// angular
			'node_modules/angular/angular.js',
			'node_modules/angular-cookies/angular-cookies.js',
			'node_modules/angular-animate/angular-animate.js',
			'node_modules/angular-aria/angular-aria.js',
			'node_modules/angular-messages/angular-messages.js',
			'node_modules/angular-sanitize/angular-sanitize.js',
			'node_modules/angular-i18n/angular-locale_de-de.js',
			// core
			'node_modules/angular-ui-router/release/angular-ui-router.js',
			'node_modules/ngstorage/ngStorage.js',
			// gui
			'node_modules/angular-material/angular-material.js',
			// angular-data-table
      'node_modules/angular-material-data-table/dist/md-data-table.js',
			// angular-resizable
			'node_modules/angular-resizable/src/angular-resizable.js',
			// angular-pan-zoom
			'node_modules/angular-mousewheel/mousewheel.js',
			'node_modules/angular-pan-zoom/release/panzoom.js',
			// angular-dropover
			'node_modules/ngdropover/dist/ngdropover.js',
			// auth
			'node_modules/satellizer/satellizer.js',
			// support
			'node_modules/angular-underscore/index.js',
			'node_modules/underscore/underscore.js',
			'node_modules/moment/moment.js',
			'node_modules/diff-match-patch/index.js',
			'node_modules/angular-diff-match-patch/angular-diff-match-patch.js',
			'node_modules/angular-translate/dist/angular-translate.js',
			'node_modules/angular-translate-storage-local/angular-translate-storage-local.js',
			'node_modules/angular-translate-storage-cookie/angular-translate-storage-cookie.js',
			'node_modules/angular-translate-loader-static-files/angular-translate-loader-static-files.js',
		],
		dest: 'public/js/'
	},
	views: {
		app: {
			'src': 'angular/app/**/*.html',
			'dest': 'public/views/app/',
		},
		directives: {
			'src': 'angular/directives/**/*.html',
			'dest': 'public/views/directives/',
		},
		dialogs: {
			'src': 'angular/dialogs/**/*.html',
			'dest': 'public/views/dialogs/',
		}
	},
	langs: {
		src: 'angular/lang/*.json',
		dest: 'public/lang/',
	},
	images: {
		'src': [
			'angular/app/**/*.png',
			'angular/app/**/*.jpg',
			'angular/app/**/*.jpeg',
		],
		'dest': 'public/images/',
	},
	styles: {
		local: ['angular/**/*.css'],
		vendor: [
			'node_modules/angular-material/angular-material.css',
      'node_modules/angular-material-data-table/dist/md-data-table.css',
			'node_modules/angular-resizable/src/angular-resizable.css',
		],
		dest: 'public/css/'
	},
	fonts: {
		local: [],
		vendor: [],
		dest: 'public/fonts/'
	}
};

function errorAlert(error){
	notify.onError({title: 'Script error', message: 'Check your terminal', sound: 'Sosumi'})(error);
	console.log(error.toString());
	this.emit('end');
};

/**
 * Main tasks
 */
const localScripts = function() {
  return src(paths.scripts.local)
    .pipe(plumber({errorHandler: errorAlert}))
    .pipe(naturalSort())
    .pipe(angularFilesort())
    .pipe(concat('local.js'))
    .pipe(dest(paths.scripts.dest));
};
const vendorScripts = function() {
  return src(paths.scripts.vendor, {base: 'node_modules'})
    .pipe(concat('vendor.js'))
    .pipe(dest(paths.scripts.dest));
};
const productionScripts = series(parallel(localScripts, vendorScripts), function() {
  return src([paths.scripts.dest + 'vendor.js', paths.scripts.dest + 'local.js'])
    .pipe(concat('scripts.js'))
    .pipe(uglify())
    .on('error', function (err) { console.log(err.toString()); })
    .pipe(dest(paths.scripts.dest));
});

const localStyles = function() {
  return src(paths.styles.local)
    .pipe(naturalSort())
    .pipe(concat('local.css'))
    .pipe(dest(paths.styles.dest));
};
const vendorStyles = function() {
  return src(paths.styles.vendor, {base: 'node_modules'})
    .pipe(concat('vendor.css'))
    .pipe(dest(paths.styles.dest));
};
const productionStyles = series(parallel(localStyles, vendorStyles), function() {
  return src([paths.styles.dest + 'vendor.css', paths.styles.dest + 'local.css'])
    .pipe(concat('styles.css'))
    .pipe(postcss())
    .pipe(dest(paths.styles.dest));
});


const viewsApp = function() {
  return src(paths.views.app.src)
    .pipe(dest(paths.views.app.dest))
};
const viewsDirectives = function() {
  return src(paths.views.directives.src)
    .pipe(dest(paths.views.directives.dest))
};
const viewsDialogs = function() {
  return src(paths.views.dialogs.src)
    .pipe(dest(paths.views.dialogs.dest))
};
const views = parallel(viewsApp, viewsDirectives, viewsDialogs);

const images = function() {
  return src(paths.images.src)
    .pipe(dest(paths.images.dest))
};

const langs = function() {
  return src(paths.langs.src)
    .pipe(dest(paths.langs.dest))
};

const vendorFonts = function() {
  return src(paths.fonts.vendor)
    .pipe(dest(paths.fonts.dest))
};

// Before we rev all the asset files, we generate them.
const revFiles = function () {
  return src([paths.styles.dest + 'styles.css', paths.scripts.dest + 'scripts.js'], {base: paths.public})
    .pipe(rev())
    .pipe(dest(paths.public))
    .pipe(rev.manifest())
    .pipe(dest(paths.public));
};

const revClean = function () {
  return del([
    paths.styles.dest + 'styles-*.css',
    paths.scripts.dest + 'scripts-*.js',
  ]);
};

/**
 * Basic tasks
 */

exports.default = exports.develop = parallel(localScripts, localStyles, views, images, langs);
exports.vendor = parallel(vendorScripts, vendorStyles);
exports.production = parallel(
  views,
  // vendorFonts,
  images,
	langs,
  series(
    revClean,
    parallel(productionScripts, productionStyles),
    revFiles,
   ),
);

// Watch local changes
exports.watch = function() {
   watch(paths.scripts.local, localScripts);
   watch(paths.styles.local, localStyles);
   watch(paths.views.app.src, viewsApp);
   watch(paths.views.directives.src, viewsDirectives);
   watch(paths.views.dialogs.src, viewsDialogs);
   watch(paths.images.src, images);
   watch(paths.langs.src, langs);
};
