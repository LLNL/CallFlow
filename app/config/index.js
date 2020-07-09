/**
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * SPDX-License-Identifier: MIT
 */
"use strict";
const path = require("path");

module.exports = {
	dev: {
		// assetsSubDirectory: "static",
		assetsPublicPath: "/",
		proxyTable: {},
		// Various Dev Server settings
		host: "localhost", // can be overwritten by process.env.HOST
		port: 80, // can be overwritten by process.env.PORT, if port is in use, a free one will be determined
		autoOpenBrowser: false,
		errorOverlay: true,
		notifyOnErrors: true,
		poll: false, // https://webpack.js.org/configuration/dev-server/#devserver-watchoptions-
		devtool: "cheap-module-eval-source-map", // https://webpack.js.org/configuration/devtool/#development
		// If you have problems debugging vue-files in devtools,
		// set this to false - it *may* help
		// https://vue-loader.vuejs.org/en/options.html#cachebusting
		cacheBusting: true,
		cssSourceMap: true
	},

	build: {
		// Template for index.html
		index: path.resolve(__dirname, "../dist/index.html"),
		// Paths
		assetsRoot: path.resolve(__dirname, "../dist"),
		assetsSubDirectory: "static",
		assetsPublicPath: "/",
		// Source Maps
		productionSourceMap: true,
		// https://webpack.js.org/configuration/devtool/#production
		devtool: "#source-map",

		// Gzip off by default as many popular static hosts such as
		// Surge or Netlify already gzip all static assets for you.
		// Before setting to `true`, make sure to:
		// npm install --save-dev compression-webpack-plugin
		productionGzip: false,
		productionGzipExtensions: ["js", "css"],

		// Run the build command with an extra argument to
		// View the bundle analyzer report after build finishes:
		// `npm run build --report`
		// Set to `true` or `false` to always turn it on or off
		bundleAnalyzerReport: process.env.npm_config_report
	}
};
