let fs = require('fs')
let browserify = require('browserify')
let livereload = require('watchify')
let madge = require('madge')
let path = require('path')

const b = browserify({
    entries: [path.resolve(__dirname) + '/app.js'],
    cache: {},
    packageCache: {},
    plugin: [livereload]
});

b.on('update', bundle)
bundle()

madge(path.resolve(__dirname + '/app.js')).then(function(res){
    console.log('Objects', res.obj())
    console.log('Warnings', res.warnings())
    console.log('Circular', res.circular())
})

function bundle(){
    console.log('Re-compiling ........')
    b.transform('babelify', { presets: ["@babel/preset-env"] })
        .on('error', console.error)
        .bundle()
        .pipe(fs.createWriteStream(path.resolve(__dirname) + '/build/bundle.js'));    
}

