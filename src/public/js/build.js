let fs = require('fs')
let browserify = require('browserify')
let madge = require('madge')

browserify('./app.js')
    .transform('babelify', { presets: ["@babel/preset-env"] })
    .bundle()
    .pipe(fs.createWriteStream('build/bundle.js'));


madge('./app.js').then(function(res){
    console.log('Objects', res.obj())
    console.log('Warnings', res.warnings())
    console.log('Circular', res.circular())
})

