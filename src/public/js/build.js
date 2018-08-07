let fs = require('fs')
let browserify = require('browserify')
let madge = require('madge')
let path = require('path')

browserify(path.resolve(__dirname) + '/app.js')
    .transform('babelify', { presets: ["@babel/preset-env"] })
    .bundle()
    .pipe(fs.createWriteStream(path.resolve(__dirname) + '/build/bundle.js'));


madge(path.resolve(__dirname + '/app.js')).then(function(res){
    console.log('Objects', res.obj())
    console.log('Warnings', res.warnings())
    console.log('Circular', res.circular())
})

