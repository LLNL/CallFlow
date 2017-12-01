import historyFallback from 'connect-history-api-fallback';
import webpackDevMiddleware from 'webpack-dev-middleware';
import webpackHotMiddleware from 'webpack-hot-middleware';
import config from './webpack.config.js';
import webpack from 'webpack';

const bundler = webpack(config);

const middleware = [
    webpackDevMiddleware(bundler, {
	filename: config.output.filename,
	publicPath: config.output.publicPath,
	hot: true,
	stats: {
	    colors: true,
	},
    }),
    webpackHotMiddleware(bundler, {
	log: console.log,
    }),
    historyFallback(),
];

export { middleware as hotMiddleware };
