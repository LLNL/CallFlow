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

// create the div element that will hold the context menu
let contextMenu = function (menu, openCallback) {
	d3.selectAll(".d3-context-menu").data([1])
		.enter()
		.append("div")
		.attr("class", "d3-context-menu");

	// close menu
	d3.select("body").on("click.d3-context-menu", () => {
		d3.select(".d3-context-menu").style("display", "none");
	});

	// this gets executed when a contextmenu event occurs
	return function (data, index) {
		const elm = this;

		d3.selectAll(".d3-context-menu").html("");
		const list = d3.selectAll(".d3-context-menu").append("ul");
		list.selectAll("li").data(menu).enter()
			.append("li")
			.html(d => d.title)
			.on("click", (d, i) => {
				d.action(elm, data, index);
				d3.select(".d3-context-menu").style("display", "none");
			});

		// the openCallback allows an action to fire before the menu is displayed
		// an example usage would be closing a tooltip
		if (openCallback) { openCallback(data, index); }

		// display context menu
		d3.select(".d3-context-menu")
			.style("left", `${d3.event.pageX - 2}px`)
			.style("top", `${d3.event.pageY - 2}px`)
			.style("display", "block");

		d3.event.preventDefault();
	};
};

export default contextMenu;