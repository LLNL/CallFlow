import webpack from 'webpack';
import merge from 'webpack-merge';
import path from 'path';
import isDev from 'isdev';
import { Dir } from './config.js';
import nodeExternals from 'webpack-node-externals';

const TARGET = process.env.npm_lifecycle_event;

let Config = {
    entry: [
	'babel-polyfill',
	path.join(Dir.src, 'public/js/app.js'),
	path.join(Dir.src, 'index.js')
    ],
    output: {
	path: path.join(Dir.public, 'build'),
	filename: 'bundle.js',
    },
    resolve: {
	extensions: ['js'],
    },
    module: {
	loaders: [{
	    test: /\.js?$/,
	    loader: 'babel-loader',
	    exclude: /node_modules/,
	}],
    },
    target: 'node',
    externals: [nodeExternals()],
    plugins: [
	new webpack.optimize.OccurrenceOrderPlugin(), 
	new webpack.DefinePlugin({
	    'process.env': {
		NODE_ENV: JSON.stringify(process.env.NODE_ENV),
	    },
	}),
    ],
};

if (TARGET === 'build-dev' && !isDev) {
    Config = merge(Config, {
	bail: true,
	devtool: 'source-map',
	output: { publicPath: '/build/' },
	plugins: [
	    new webpack.optimize.DedupePlugin(),
	    new webpack.optimize.UglifyJsPlugin({
		comments: false,
		dropDebugger: true,
		dropConsole: true,
		compressor: {
		    warnings: false,
		},
	    }),
	],
    });
}

if (TARGET === 'server' && isDev) {
    Config = merge(Config, {
	devtool: 'eval',
	entry: ['webpack-hot-middleware/client'],
	plugins: [
	    new webpack.HotModuleReplacementPlugin(),
	    new webpack.NoErrorsPlugin(),
	],
    });
}

const WebpackConfig = Config;
export default WebpackConfig;


/*var path = require("path");

var commonLoaders = [
	{ test: /\.js$/, loader: "jsx-loader" },
];

module.exports = [
	{
		// The configuration for the client
		name: "browser",
		entry: "./app/entry.js",
		output: {
			path: assetsPath,
			filename: "[hash].js",
			publicPath: publicPath
		},
		module: {
			loaders: commonLoaders.concat([
				{ test: /\.css$/, loader: "style-loader!css-loader" },
			])
		},
		plugins: [
			function(compiler) {
				this.plugin("done", function(stats) {
					require("fs").writeFileSync(path.join(__dirname, "server", "stats.generated.json"), JSON.stringify(stats.toJson()));
				});
			}
		]
	},
	{
		// The configuration for the server-side rendering
		name: "server-side rendering",
		entry: "./server/page.js",
		target: "node",
		output: {
			path: assetsPath,
			filename: "../../server/page.generated.js",
			publicPath: publicPath,
			libraryTarget: "commonjs2"
		},
		externals: /^[a-z\-0-9]+$/,
		module: {
			loaders: commonLoaders.concat([
				{ test: /\.css$/,  loader: path.join(__dirname, "server", "style-collector") + "!css-loader" },
			])
		}
	}
];*/
