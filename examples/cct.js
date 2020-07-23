/*
    Build bar chart for # of species currently selected in cell above
*/
(function (element) {
    require(['d3', 'dagreD3'], function (d3, dagreD3) {

        /**
		 * Create a dagre-d3 instance.
		 * 
		 * @return {dagreD3 Graph}
		 */
        function createGraph() {
            const g = new dagreD3.graphlib.Graph({
                directed: true,
                multigraph: false,
                compound: true
            });

            g.setGraph({
                rankDir: 'TD',
                rankSep: 50,
                marginx: 30,
                marginy: 30
            });

            return g;
        }

        		/**
		 * Sets callsite's name. 
		 * if key "name" is present, then use it, else use nxg node's id. 
		 * 
		 * @param {Object} callsite 
		 * @return {String} callsite's name
		 */
		function setCallsiteName(callsite) {
			if (callsite["name"] == undefined) {
				return callsite["id"];
			}
			return callsite["name"];
        }

        function hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16),
            } : null;
        }
        
        function setContrast(hex) {
            const rgb = hexToRgb(hex);
            const o = Math.round(((parseInt(rgb.r) * 299) +
                (parseInt(rgb.g) * 587) +
                (parseInt(rgb.b) * 114)) / 1000);
    
            return (o > 128) ? "#000" : "#fff";
        }

        function rgbToHex(r, g, b) {
            return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        }

		/**
		 * Set callsite's text and fill color.
		 *
		 * @param {Object} callsite 
		 * @return {JSON<{'node': Color, 'text': Color}>} 'node': fill color, 'text': text color
		 */
		function setCallsiteColor(callsite, metric, colorScale) {
            // Set node fill color.
            const fillColor = colorScale(callsite[metric]);
            console.log(fillColor)

			// Set node text color.
            const textColor = setContrast(d3.color(fillColor).formatHex());
            
            // console.log(fillColor, textColor)

			return {
				'node': fillColor,
				'text': textColor
			}
		}

		/**
		 * Sets the html content for rendering inside a node.
		 * 
		 * @param {String} callsite 
		 * @param {JSON<{'node': Color, 'text': Color}>} callsite_color
		 * @return {HTML} html for rendering. 
		 */
		function setCallsiteHTML(callsite, callsite_color) {
            
			let html = (callsite_color['text'] === "#fff")
				? '<div class="white-text"><span>' + callsite['name'] + '</span>'
				: '<div class="black-text"><span>' + callsite['name'] + '</span>';
			
			// if (this.has_data_map["module"]) {
            module = callsite["module"];
				// html = html + '<br/><span class="description"><b>Module :</b> ' + module + '</span> </div>';
			// }
			return html;
		}

        /**
		 * Renders the nodes in the dagre d3 graph.
		 * 
		 * @param {JSON} data - networkX graph. 
		 */
        function nodes(g, data, metric, colorScale) {
            data.forEach((node, i) => {
                const callsite_name = setCallsiteName(node);
                const callsite_color = setCallsiteColor(node, metric, colorScale);
                const label = setCallsiteHTML(node, callsite_color);

                const payload = {
                    ...node,
                    class: 'cct-node',
                    labelType: 'html',
                    label: label,
                    fillColor: callsite_color['node'],
                };

                g.setNode(callsite_name, payload);
            });

            // set styles.
            g.nodes().forEach(function (v) {
                let node = g.node(v);
                if (node != undefined) {
                    node.style = "fill:" + node.fillColor;
                    node.rx = node.ry = 4;
                }
            });

            return g
        }

		/**
		 * Renders the edges in the dagre D3 graph.
		 * 
		 * @param {JSON} links - nxGraph edges.
		 */
        function edges(g, links) {
            for (let i = 0; i < links.length; i += 1) {
                let edge_label = "";
                if (links[i]["count"] != 1) {
                    edge_label = "" + links[i]["count"];
                }
                else {
                    edge_label = "";
                }
                g.setEdge(links[i]["source"], links[i]["target"], {
                    // label: edge_label,
                    arrowhead: "vee",
                });
            }

            g.edges().forEach((e) => {
                let edge = g.edge(e);
                edge.id = "cct-edge";    
                edge.style = "stroke: #000; fill: #fff";
            });

            return g
        }

        function getColorMinMax(data, metric) {
            let colorMin = 0;
            let colorMax = 0;
            data.forEach((d) => {
                colorMin = Math.min(d[metric], colorMin);
                colorMax = Math.max(d[metric], colorMax);
            })
            return [colorMin, colorMax]
        }

        /**
		 * Translate and zoom to fit the graph to the entire SVG's context.
		 * 
		 */
		function zoomTranslate(g, zoom) {
			const graphWidth = g.graph().width + 80;
			const graphHeight = g.graph().height + 40;
			
			const width = parseInt(svg.style("width").replace(/px/, ""));
			const height = parseInt(svg.style("height").replace(/px/, ""));

			// Set the zoom scale
			let zoomScale = Math.min(width / graphWidth, height / graphHeight);
			if (zoomScale > 1.4) zoomScale -= 0.1;

			// Set the translate
			const translate = [(width - (graphWidth * zoomScale)) * 0.5, (height - (graphHeight * zoomScale)) * 0.5 ];

			// Move the svg based on translate.
			svg.call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(zoomScale));
		}

        if (argList.length == 0) {
            return;
        }

        const data = JSON.parse(argList[1]);
        const metric = argList[2];

        const width = "900px";
        const height = "500px";

        // Create a svg
        let svg = d3.select(element).append("svg")
                    .style("height", height)
                    .style("width", width);
        const inner = svg.append('g').attr("id", "container");

        
        const colorMinMax = getColorMinMax(data.nodes, metric);

        const colorScale = d3.scaleLinear()
            .domain([colorMinMax[0], colorMinMax[1]])
            .range(["red", "green"]);


        // // Create a dagre D3 graph.
        let g = createGraph();

        // Add nodes and edges. 
        g = nodes(g, data.nodes, metric, colorScale);
        g = edges(g, data.links);

        const dagreRender = new dagreD3.render();

        const zoom = d3.zoom().on("zoom", function () {
            inner.attr("transform", d3.event.transform);
        });

        svg.call(zoom);

        dagreRender(inner, g);

        zoomTranslate(g, zoom);

        svg.selectAll("g.node").on("click", function (id) {
            node_click_action(id);
            dagreRender(inner, g);
            zoomTranslate();
        });
    })
})(element);