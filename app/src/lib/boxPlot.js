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
import * as d3 from "d3";

// Inspired by http://informationandvisualization.de/blog/box-plot
function boxPlot() {
	var width = 1,
		height = 1,
		duration = 0,
		domain = null,
		value = Number,
		whiskers = boxWhiskers,
		quartiles = boxQuartiles,
		showLabels = true, // whether or not to show text labels
		numBars = 4,
		curBar = 1,
		tickFormat = null;

	// For each small multiple…
	function box(g) {
		g.each(function (data, i) {
			//d = d.map(value).sort(d3.ascending);
			//var boxIndex = data[0];
			//var boxIndex = 1;
			var d = data.sort(d3.ascending);

			var g = d3.select(this),
				n = d.length,
				min = d[0],
				max = d[n - 1];

			// Compute quartiles. Must return exactly 3 elements.
			var quartileData = d.quartiles = quartiles(d);

			// Compute whiskers. Must return exactly 2 elements, or null.
			var whiskerIndices = whiskers && whiskers.call(this, d, i),
				whiskerData = whiskerIndices && whiskerIndices.map(function (i) { return d[i]; });

			// Compute outliers. If no whiskers are specified, all data are "outliers".
			// We compute the outliers as indices, so that we can join across transitions!
			var outlierIndices = whiskerIndices
				? d3.range(0, whiskerIndices[0]).concat(d3.range(whiskerIndices[1] + 1, n))
				: d3.range(n);

			// Compute the new x-scale.
			var x1 = d3.scaleLinear()
				.domain([min, max])
				.range([0, width]);

			// Retrieve the old x-scale, if this is an update.
			var x0 = this.__chart__ || d3.scaleLinear()
				// .domain([0, Infinity])
				.domain([min, max])
				.range(x1.range());

			// Stash the new scale.
			this.__chart__ = x1;

			// Note: the box, median, and box tick elements are fixed in number,
			// so we only have to handle enter and update. In contrast, the outliers
			// and other elements are variable, so we need to exit them! Variable
			// elements also fade in and out.

			// Update innerquartile box.
			var box = g.selectAll("rect.box")
				.data([quartileData]);

			box.enter().append("rect")
				.attr("class", "box")
				.attr("y", 12.5)
				.attr("x", function (d) { return x0(d[0]); })
				.attr("height", height - 25)
				.attr("fill", "#c0c0c0")
				.attr("width", function (d) { return - x0(d[0]) + x0(d[2]); })
				.style("z-index", 1)
				.transition()
				.duration(duration)
				.attr("x", function (d) { return x1(d[0]); })
				.attr("width", function (d) { return - x1(d[0]) + x1(d[2]); });

			box.transition()
				.duration(duration)
				.attr("x", function (d) { return x1(d[0]); })
				.attr("width", function (d) { return - x1(d[0]) + x1(d[2]); });

			// Update center line: the vertical line spanning the whiskers.
			var center = g.selectAll("line.center")
				.data(whiskerData ? [whiskerData] : []);

			//horizontal line
			center.enter().insert("line", "rect")
				.attr("class", "center")
				.attr("y1", height / 2 - 5)
				.attr("x1", function (d) { return x0(d[0]); })
				.attr("y2", height / 2 - 5)
				.attr("x2", function (d) { return x0(d[1]); })
				.style("opacity", 1e-6)
				.style("z-index", 10)
				.transition()
				.duration(duration)
				.style("opacity", 1)
				.attr("x1", function (d) { return x1(min); })
				.attr("x2", function (d) { return x1(max); });

			center.transition()
				.duration(duration)
				.style("opacity", 1)
				.attr("x1", function (d) { return x1(min); })
				.attr("x2", function (d) { return x1(max); });

			center.exit().transition()
				.duration(duration)
				.style("opacity", 1e-6)
				.attr("x1", function (d) { return x1(min); })
				.attr("x2", function (d) { return x1(max); })
				.remove();


			// Update median line.
			var medianLine = g.selectAll("line.median")
				.data([quartileData[1]]);

			medianLine.enter().append("line")
				.attr("class", "median")
				.attr("y1", 0)
				.attr("x1", x0)
				.attr("y2", width)
				.attr("x2", x0)
				.transition()
				.duration(duration)
				.attr("x1", x1)
				.attr("x2", x1);

			medianLine.transition()
				.duration(duration)
				.attr("x1", x1)
				.attr("x2", x1);

			// Update whiskers.
			var whisker = g.selectAll("line.whisker")
				.data([min, max]);

			whisker.enter().insert("line", "circle, text")
				.attr("class", "whisker")
				.attr("y1", 0)
				.attr("x1", x0)
				.attr("y2", 0 + width)
				.attr("x2", x0)
				.style("opacity", 1e-6)
				.transition()
				.duration(duration)
				.attr("x1", x1)
				.attr("x2", x1)
				.style("opacity", 1);

			whisker.transition()
				.duration(duration)
				.attr("x1", x1)
				.attr("x2", x1)
				.style("opacity", 1);

			whisker.exit().transition()
				.duration(duration)
				.attr("x1", x1)
				.attr("x2", x1)
				.style("opacity", 1e-6)
				.remove();

			// Update outliers.
			var outlier = g.selectAll("circle.outlier")
				.data(outlierIndices, Number);

			outlier.enter().insert("circle", "text")
				.attr("class", "outlier")
				.attr("r", 5)
				.attr("cy", height / 2 - 5)
				.attr("cx", function (i) { return x0(d[i]); })
				.style("opacity", 1e-6)
				.transition()
				.duration(duration)
				.attr("cx", function (i) { return x1(d[i]); })
				.style("opacity", 1);

			outlier.transition()
				.duration(duration)
				.attr("cx", function (i) { return x1(d[i]); })
				.style("opacity", 1);

			outlier.exit().transition()
				.duration(duration)
				.attr("cx", function (i) { return x1(d[i]); })
				.style("opacity", 1e-6)
				.remove();

			// Compute the tick format.
			var format = tickFormat || x1.tickFormat(8);

			// // Update box ticks.
			// var boxTick = g.selectAll("text.box")
			//     .data(quartileData);
			// if (showLabels == true) {
			//     boxTick.enter().append("text")
			//         .attr("class", "box")
			//         .attr("dy", ".3em")
			//         .attr("dx", function (d, i) { return i & 1 ? 3 : -3 })
			//         .attr("y", function (d, i) { return i & 1 ? + height - 10 : 10 })
			//         .attr("x", x0)
			//         .attr("text-anchor", function (d, i) { return i & 1 ? "start" : "end"; })
			//         .text(format)
			//         .transition()
			//         .duration(duration)
			//         .attr("x", x1);
			// }

			// boxTick.transition()
			//     .duration(duration)
			//     .text(format)
			//     .attr("x", x1);

			// For min
			var minWhiskerTick = g.selectAll("text.min-whisker")
				.data([whiskerData[0]] || []);
			if (showLabels == true) {
				minWhiskerTick.enter().append("text")
					.attr("class", "min-whisker")
					.attr("dy", ".3em")
					.attr("dx", 6)
					.attr("y", height - 10)
					.attr("x", x0)
					.text(format)
					.style("opacity", 1e-6)
					.transition()
					.duration(duration)
					.attr("x", x1)
					.style("opacity", 1);
			}
			minWhiskerTick.transition()
				.duration(duration)
				.text(format)
				.attr("x", x1)
				.style("opacity", 1);

			minWhiskerTick.exit().transition()
				.duration(duration)
				.attr("x", x1 - 10)
				.style("opacity", 1e-6)
				.remove();

			var maxWhiskerTick = g.selectAll("text.max-whisker")
				.data([whiskerData[1]] || []);
			if (showLabels == true) {
				maxWhiskerTick.enter().append("text")
					.attr("class", "max-whisker")
					.attr("dy", ".3em")
					.attr("dx", width * 0.80)
					.attr("y", height - 10)
					.attr("x", (d) => { return x0; })
					.text(format)
					.style("opacity", 1e-6)
					.transition()
					.duration(duration)
					.attr("x", x1)
					.style("opacity", 1);
			}
			maxWhiskerTick.transition()
				.duration(duration)
				.text(format)
				.attr("x", x1)
				.style("opacity", 1);

			maxWhiskerTick.exit().transition()
				.duration(duration)
				.attr("x", x1)
				.style("opacity", 1e-6)
				.remove();
		});
	}

	box.width = function (x) {
		if (!arguments.length) { return width; }
		width = x;
		return box;
	};

	box.height = function (x) {
		if (!arguments.length) { return height; }
		height = x;
		return box;
	};

	box.tickFormat = function (x) {
		if (!arguments.length) { return tickFormat; }
		tickFormat = x;
		return box;
	};

	box.duration = function (x) {
		if (!arguments.length) { return duration; }
		duration = x;
		return box;
	};

	box.domain = function (x) {
		if (!arguments.length) { return domain; }
		domain = x == null ? x : x;
		return box;
	};

	box.value = function (x) {
		if (!arguments.length) { return value; }
		value = x;
		return box;
	};

	box.whiskers = function (x) {
		if (!arguments.length) { return whiskers; }
		whiskers = x;
		return box;
	};

	box.showLabels = function (x) {
		if (!arguments.length) { return showLabels; }
		showLabels = x;
		return box;
	};

	box.quartiles = function (x) {
		if (!arguments.length) { return quartiles; }
		quartiles = x;
		return box;
	};
	return box;
}

function boxWhiskers(d) {
	return [0, d.length - 1];
}

function boxQuartiles(d) {
	return [
		d3.quantile(d, .25),
		d3.quantile(d, .5),
		d3.quantile(d, .75)
	];
}

export default boxPlot;