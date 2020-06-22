/**
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * SPDX-License-Identifier: MIT
 */
import * as d3 from "d3";
import * as chroma from "chroma-js";
import colorbrewer from "./colorBrewer";

export default class Color {
	constructor(option, scale) {
		this.option = option;
		this.incColorScale = null;
		this.excColorScale = null;
		this.nRangeColorScale = null;
		this.diffColorScale = null;
		this.meanDiffColorScale = null;
		this.loadImbColorScale = null;
		this.binColorScale = null;
		this.rankDiffColorScale = null;
		this.grey = "#252525";
		this.highlight = "#377eb8";
		this.colors = ["red", "green", "yellow", "blue", "black", "white"];
		this.catColors = ["#3366cc", "#dc3912", "#ff9900", "#109618", "#990099", "#0099c6", "#dd4477", "#66aa00", "#b82e2e", "#316395", "#994499", "#22aa99", "#aaaa11", "#6633cc", "#e67300", "#8b0707", "#651067", "#329262", "#5574a6", "#3b3eac"];
		this.colorMap = [];
		this.colorPadding = [];
		this.colorPallette = {
			0: [0.31, 0.48, 0.65],
			1: [0.94, 0.56, 0.22],
			2: [0.87, 0.35, 0.36],
			3: [0.47, 0.72, 0.70],
			4: [0.36, 0.63, 0.32],
			5: [0.93, 0.78, 0.33],
			6: [0.69, 0.48, 0.63],
			7: [0.99, 0.62, 0.66],
			8: [0.61, 0.46, 0.38],
			9: [0.73, 0.69, 0.67],
			blue: [0.31, 0.48, 0.65],
			orange: [0.94, 0.56, 0.22],
			red: [0.87, 0.35, 0.36],
			teal: [0.47, 0.72, 0.70],
			green: [0.36, 0.63, 0.32],
			yellow: [0.93, 0.78, 0.33],
			purple: [0.69, 0.48, 0.63],
			pink: "#610121",
			brown: [0.61, 0.46, 0.38],
			gray: [0.73, 0.69, 0.67]
		};
		this.colorbrewer = colorbrewer;
	}

	setColorPadding(colorPoint) {
		let ret = [];
		let fraction = 1 / colorPoint;
		for (let i = 0; i < colorPoint; i += 1) {
			ret.push(i * fraction);
		}
		ret.push(1);
		return ret;
	}

	setColorScale(min, max, colorType, colorPoint) {
		this.colorMin = min;
		this.colorMax = max;
		if (colorType == "Default") {
			this.colorMap = ["white", "#023858"];
		}
		else {
			this.colorMap = this.colorbrewer[colorType][colorPoint];
		}
		this.colorPadding = this.setColorPadding(colorPoint);
		if (this.option == "Module") {
			this.colorScale = d3.scaleOrdinal(d3.schemeCategory10);
		} else if (this.option == "Inclusive") {
			this.incColorScale = chroma.scale(this.colorMap)
				.padding([0.1, 0.0])
				.gamma(0.5)
				.domain([min, max]);
		} else if (this.option == "Exclusive") {
			this.excColorScale = chroma.scale(this.colorMap)
				.padding([0.0, 0.0])
				.gamma(2)
				.domain([min, max])
				.correctLightness();
		} else if (this.option == "nRange") {
			this.nRangeColorScale = chroma.scale(this.colorMap)
				.domain([0, 1]);
		} else if (this.option == "Dist") {
			this.diffColorScale = chroma.scale(this.colorMap)
				.domain([-1, 1]);
		} else if (this.option == "Imbalance") {
			this.loadImbColorScale = chroma.scale(this.colorMap)
				.domain([0, 1]);
		} else if (this.option == "MeanDiff") {
			let mmax = Math.max(Math.abs(min), Math.abs(max));
			this.meanDiffColorScale = chroma.scale(this.colorMap)
				.padding([0.0, 0.0])
				.domain([mmax, -mmax]);
		} else if (this.option == "RankDiff") {
			this.rankDiffColorScale = chroma.scale(this.colorMap)
			// .padding(this.colorPadding)
				.gamma(0.5)
				.domain([min, max]);
		} else if (this.option == "Bin") {
			this.binColorScale = chroma.scale(this.colorMap)
				.padding([0.05, 0.0])
				.gamma(0.5)
				.domain([min, max]);

			// this.binColorScale = chroma.cubehelix()
			//     .start(0)
			//     .rotations(-0.35)
			//     .gamma(0.2)
			//     .lightness([1.0, 0.8])
			//     .scale()
		}
	}

	getScale(option) {
		if (option == "Module") {
			return this.colorScale;
		} else if (option == "Inclusive") {
			return this.incColorScale;
		} else if (option == "Exclusive") {
			return this.excColorScale;
		} else if (option == "nRange") {
			return this.nRangeColorScale;
		} else if (option == "Diff") {
			return this.diffColorScale;
		} else if (option == "Imbalance") {
			return this.loadImbColorScale;
		} else if (option == "MeanDiff") {
			return this.meanDiffColorScale;
		} else if (option == "RankDiff") {
			return this.rankDiffColorScale;
		} else if (option == "Bin") {
			return this.binColorScale;
		}
	}

	getColor(node) {
		if (this.option == "Module") {
			return this.colorScale(node.module);
		} else if (this.option == "Inclusive") {
			return this.incColorScale(node["time (inc)"]);
		} else if (this.option == "Exclusive") {
			return this.excColorScale(node["time"]);
		} else if (this.option == "nRange") {
			return this.nRangeColorScale(node.nRange);
		} else if (this.option == "Diff") {
			return this.diffColorScale(node.diff);
		} else if (this.option == "Imbalance") {
			return this.loadImbColorScale(node.imbalance_perc);
		} else if (this.option == "MeanDiff") {
			return this.meanDiffColorScale(node.mean_diff);
		} else if (this.option == "RankDiff") {
			return this.rankDiffColorScale(node.rank_diff);
		} else if (this.option == "Bin") {
			return this.binColorScale(node.bin);
		}
	}

	getColorByValue(value) {
		if (this.option == "Module") {
			return this.colorScale(value);
		} else if (this.option == "Inclusive") {
			return this.incColorScale(value);
		} else if (this.option == "Exclusive") {
			return this.excColorScale(value);
		} else if (this.option == "nRange") {
			return this.nRangeColorScale(value);
		} else if (this.option == "Diff") {
			return this.diffColorScale(value);
		} else if (this.option == "Imbalance") {
			return this.loadImbColorScale(value);
		} else if (this.option == "MeanDiff") {
			return this.meanDiffColorScale(value);
		} else if (this.option == "RankDiff") {
			return this.rankDiffColorScale(value);
		} else if (this.option == "Bin") {
			return this.binColorScale(value);
		}
	}

	CYKToRGB(CMYK) {
		let result = {};
		let c = CMYK[0];
		let m = CMYK[1];
		let y = CMYK[2];
		let k = 0;

		result.r = 1 - Math.min(1, c * (1 - k) + k);
		result.g = 1 - Math.min(1, m * (1 - k) + k);
		result.b = 1 - Math.min(1, y * (1 - k) + k);

		result.r = Math.round(result.r * 255);
		result.g = Math.round(result.g * 255);
		result.b = Math.round(result.b * 255);


		function componentToHex(c) {
			var hex = c.toString(16);
			return hex.length == 1 ? "0" + hex : hex;
		}

		return "#" + componentToHex(result.r) + componentToHex(result.g) + componentToHex(result.b);
	}

	setContrast(hex) {
		const rgb = this.hexToRgb(hex);
		const o = Math.round(((parseInt(rgb.r) * 299) +
            (parseInt(rgb.g) * 587) +
            (parseInt(rgb.b) * 114)) / 1000);

		return (o > 128) ? "#000" : "#fff";
	}

	getAllColors() {
		return Object.keys(this.colorbrewer);
	}

	hexToRgb(hex) {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16),
		} : null;
	}

	rgbToHex(r, g, b) {
		return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
	}

	rgbArrayToHex(color_arr) {
		color_arr = color_arr._rgb;
		let r = Math.floor(color_arr[0]);
		let g = Math.floor(color_arr[1]);
		let b = Math.floor(color_arr[2]);
		return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
	}

	getCatColor(id) {
		return this.catColors[id];
	}
}