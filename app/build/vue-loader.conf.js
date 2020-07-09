/*******************************************************************************
 * Copyright (c) 2020, Lawrence Livermore National Security, LLC.
 * Produced at the Lawrence Livermore National Laboratory.
 *
 * Written by Suraj Kesavan <spkesavan@ucdavis.edu>.
 *
 * LLNL-CODE-740862. All rights reserved.
 *
 * This file is part of CallFlow. For details, see:
 * https://github.com/LLNL/CallFlow
 * Please also read the LICENSE file for the MIT License notice.
 ******************************************************************************/
"use strict";
const utils = require("./utils");
const config = require("../config");
const isProduction = process.env.NODE_ENV === "production";
const sourceMapEnabled = isProduction
	? config.build.productionSourceMap
	: config.dev.cssSourceMap;

module.exports = {
	loaders: utils.cssLoaders({
		sourceMap: sourceMapEnabled,
		extract: isProduction
	}),
	cssSourceMap: sourceMapEnabled,
	cacheBusting: config.dev.cacheBusting,
	transformToRequire: {
		video: ["src", "poster"],
		source: "src",
		img: "src",
		image: "xlink:href"
	}
};
