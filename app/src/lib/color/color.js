/**
 * Copyright 2017-2020 Lawrence Livermore National Security, LLC and other
 * CallFlow Project Developers. See the top-level LICENSE file for details.
 * SPDX-License-Identifier: MIT
 */
import * as d3 from "d3";
import * as chroma from "chroma-js";
import { CategoricalColors, UniformColorMaps, ColorBrewer } from "./COLORS";
import { scale } from "chroma-js";

export default class Color {
	constructor() {
		this.colorMin = 0
		this.colorMax = 0
		this.colorscale = null
		this.grey = "#252525";
		this.highlight = "#AF9B90";
		this.ensemble = "#C0C0C0";
		this.target = 
		this.catColors = ["#3366cc", "#dc3912", "#ff9900", "#109618", "#990099", "#0099c6", "#dd4477", "#66aa00", "#b82e2e", "#316395", "#994499", "#22aa99", "#aaaa11", "#6633cc", "#e67300", "#8b0707", "#651067", "#329262", "#5574a6", "#3b3eac"];
		this.colorMap = [];
		this.colorPadding = [];
		this.categoricalColors = CategoricalColors;
		this.colorbrewer = ColorBrewer;
		this.UniformColorMaps = UniformColorMaps;
	}

	getScale() {
		return this.colorscale
	}

	getColor(dictionary, attribute) {
		return this.colorscale(dictionary[attribute]);
	}

	getColorByValue(value) {
		return this.colorscale(value)
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

	setColorScale(type = 'Inclusive', min = 0, max = 0, scaleType = "Default", colorPoint = '9') {
		this.colorMin = min;
		this.colorMax = max;
		// this.colorMap = this.colorbrewer[scaleType][colorPoint];
		this.colorPadding = this.setColorPadding(colorPoint);

		let colorscale = null;
		console.log(scaleType)
		switch (type) {
			case "Module":
				colorscale = d3.scaleOrdinal(d3.schemeCategory10);
				break;
			case "Inclusive":
				colorscale = chroma.scale(scaleType)
					.padding([0.1, 0.0])
					.gamma(0.5)
					.domain([min, max]);
				break;
			case "Exclusive":
				colorscale = chroma.scale(scaleType)
					.padding([0.0, 0.0])
					.gamma(2)
					.domain([min, max])
					// .correctLightness();
				break;
			case "Imbalance":
				colorscale = chroma.scale(this.colorMap)
					.domain([0, 1]);
				break;
			case "MeanDiff":
				let mmax = Math.max(Math.abs(min), Math.abs(max));
				colorscale = chroma.scale(scaleType)
					.padding([0.0, 0.0])
					.domain([mmax, -mmax]);
				break;
			case "RankDiff":
				colorScale = chroma.scale(scaleType)
					.gamma(0.5)
					.domain([min, max]);
				break;
			case "MeanGradients":
				colorscale = chroma.scale(scaleType)
					.padding([0.05, 0.0])
					.gamma(0.5)
					.domain([min, max])
				break;
		}
		this.colorscale = colorscale
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

	getCatColor(id) {
		return this.catColors[id];
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

	valToPercentColor(val, colormap) {
		const idx = Math.min(
			Math.max(0, Math.round(val * colormap.length)),
			colormap.length - 1);

		return colormap[idx];
	}

	percentColToD3Rgb(percentCol) {
		const col256 = percentCol.map(elm => Math.round(elm * 255));
		return `rgb(${col256[0]}, ${col256[1]}, ${col256[2]})`;
	}

	valToD3Rgb(val, colormap) {
		return this.percentColToD3Rgb(valToPercentColor(val, colormap));
	}

}