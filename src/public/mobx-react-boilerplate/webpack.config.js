var path = require('path');
var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
    devtool: 'eval',
    entry: [
	'./src/index'
    ],
    output: {
	path: path.join(__dirname, 'dist'),
	filename: 'bundle.js',
	publicPath: '/static/'
    },
    plugins: [
	new webpack.HotModuleReplacementPlugin(),
	new webpack.ProvidePlugin({
	    React: 'react',
	    ReactDOM: 'react-dom',
	    $: 'jquery',
	    jQuery: 'jquery'
	}),
	new ExtractTextPlugin('styles.css')
    ],
    resolve: {
	extensions: ['.js', '.jsx']
    },
    module: {
	rules: [{
	    test: /\.jsx?$/,
	    use: ['babel-loader'],
	    include: path.join(__dirname, 'src')
	},
	{
            test: /\.css$/,
            exclude: /node_modules/,
            include: path.join(__dirname, 'src'),
            use: ExtractTextPlugin.extract({
		fallback: 'style-loader',
		use: 'css-loader'
            })
	}]
    }
};
