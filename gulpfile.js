// 引入需要的模块
var gulp = require('gulp');
var cleanCSS = require('gulp-clean-css');
var uglify = require('gulp-uglify');
var htmlmin = require('gulp-htmlmin');
var htmlclean = require('gulp-htmlclean');

async function loadImagemin() {
    return import('gulp-imagemin');
}

// 压缩public目录下所有html文件, minify-html是任务名, 设置为default，启动gulp压缩的时候可以省去任务名
gulp.task('minify-html', function () {
    return gulp.src('./public/**/*.html') // 压缩文件所在的目录
        .pipe(htmlclean())
        .pipe(htmlmin({
            removeComments: true,
            minifyJS: true,
            minifyCSS: true,
            minifyURLs: true,
        }))
        .pipe(gulp.dest('./public')) // 输出的目录
});

// 压缩css
gulp.task('minify-css', function () {
    return gulp.src(['./public/**/*.css', '!./public/js/**/*min.css'])
        .pipe(cleanCSS({
            compatibility: 'ie8'
        }))
        .pipe(gulp.dest('./public'));
});
// 压缩js
gulp.task('minify-js', function () {
    return gulp.src(['./public/**/*.js', '!./public/js/**/*min.js'])
        .pipe(uglify())
        .pipe(gulp.dest('./public'));
});
// 压缩图片
gulp.task('minify-images', function () {
    return loadImagemin().then(function (imageminModule) {
        var imagemin = imageminModule.default;
        return gulp.src(['./public/**/*.png', './public/**/*.PNG',
            './public/**/*.jpg', './public/**/*.JPG',
            './public/**/*.jpeg', './public/**/*.JPEG',
            './public/**/*.gif', './public/**/*.GIF'])
            .pipe(imagemin(
                [imageminModule.gifsicle({ 'optimizationLevel': 3 }),
                imageminModule.mozjpeg({ 'progressive': true }),
                imageminModule.optipng({ 'optimizationLevel': 5 }),
                imageminModule.svgo()],
                { 'verbose': true }))
            .pipe(gulp.dest('./public'));
    });
});

// gulp 4.0 适用的方式
gulp.task('default', gulp.parallel('minify-html', 'minify-css', 'minify-js', 'minify-images'
), function () {
    console.log("----------gulp Finished----------");
});