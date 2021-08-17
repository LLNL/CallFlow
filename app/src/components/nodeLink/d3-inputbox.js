import * as d3 from "d3";

export default function d3InputBox() {
	const radius = 3;

	function render(selection) {
		selection.each(function (d, i) {
			const g = d3.select(this)
				.attr("id", "d3-inputbox" + i)
				.attr("transform", "translate(" + d.x + "," + d.y + ")");

			g.append("text")
				.attr("dx", 12)
				.attr("dy", d.height / 2 + 4)
				.text(d.label);

			g.append("text")
				.attr("id", "value")
				.attr("dx", d.width - 12)
				.attr("dy", d.height / 2 + 4)
				.text(d.supernode)
				.classed("value", true);

			g.insert("rect", "text", "value")
				.attr("x", 0)
				.attr("y", 0)
				.attr("width", d.width)
				.attr("height", d.height)
				.attr("rx", radius)
				.attr("ry", radius)
				.on("mouseover", mouseover)
				.on("mouseout", mouseout)
				.on("click", click);
		});

	}

	function mouseover() { 
		d3.select(this.parentNode).select("rect").classed("active", true); 
	}
	
	function mouseout() { 
		d3.select(this.parentNode).select("rect").classed("active", false); 
	}

	function click(d, i) {
		d3.selectAll("foreignObject").remove();

		const p = this.parentNode;
		const field = d3.select(p);

		var xy0 = this.getBBox();
		var xy1 = p.getBBox();

		xy0.x -= xy1.x - d.width + 96;
		xy0.y -= xy1.y + 2 - 8;

		const frm = field.append("foreignObject");
		const inp = frm
			.attr("x", xy0.x)
			.attr("y", xy0.y)
			.attr("width", 80)
			.attr("height", 32)
			.append("xhtml:form")
			.append("input")
			.style("width", "80px")
			.style("height", "20")
			.attr("type", "selection")
			.on("change", function () {
				d.supernode = this.supernode;
				field.select("#value").text(d.supernode);
			})
			.attr("value", function () { return d.supernode; })
			.on("keypress", function () {
				var e = d3.event;

				if (e.keyCode == 13) {

					d.supernode = inp.node().value;
					field.select("foreignObject").remove();
					field.select("#value").text(d.supernode);

				}
			});
	}

	return render;
}