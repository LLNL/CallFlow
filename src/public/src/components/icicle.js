import tpl from '../html/icicle.html'
import * as d3 from 'd3'
import dropdown from 'vue-dropdowns'

export default {
	name: 'Icicle',
	template: tpl,
	components: {
		'dropdown': dropdown
	},
	props: [],
	data: () => ({
		margin: {
			top: 5,
			right: 5,
			bottom: 5,
			left: 5,
		},
		level: [0, 0],
		colorByAttr: 'Inclusive',
		direction: ['LR', 'TD'],
		selectedDirection: 'TD',
		textTruncForNode: 15,
		color: null,
		width: null, 
		height: null,
		totalSize: 0,
		b : {
			w: 150, h: 30, s: 3, t: 10
		},
		selectedSplitOption: {
			name: "split-caller",
		},
		splitOptions: [
			{ 
				"name": 'split-caller',
			}, 
			{ 
				"name": 'split-callee',
			}, 
			{
				"name":'split-level', 
			}],
		placeholder: 'Split options',
		maxLevel: 0,
		path_hierarchy: [],
		id: ''
	}),

	watch: {
		level: {
			handler: function(val, oldVal) {
				this.update_level(); 
			},
			deep: true
		}
	},

	sockets: {
		hierarchy(data) {
			data = JSON.parse(data)	
			console.log("Module hierarchy: ", data)
			this.update_from_df(data)
		},

		dist_hierarchy(data){
			data = JSON.parse(data)
			console.log("Module hierarchy: ", data)
			this.update_from_df(data)
		},
		level_change(data){
			this.update_maxlevels(data)
		}
	},

	mounted() {
		this.id = 'icicle-overview-' + this._uid
	},

	methods: {
		init() {
					
		},

		setupSVG() {
			this.toolbarHeight = document.getElementById('toolbar').clientHeight
			this.footerHeight = document.getElementById('footer').clientHeight
			this.icicleToolbarHeight = document.getElementById('icicle-toolbar').clientHeight
			this.width = window.innerWidth*0.3
			this.height = (window.innerHeight - this.toolbarHeight - this.footerHeight - this.icicleToolbarHeight)*0.5
            this.icicleWidth = this.width - this.margin.right - this.margin.left
			this.icicleHeight = this.height - this.margin.top - this.margin.bottom	
			
			this.hierarchySVG = d3.select('#' + this.id)
				.append('svg')
				.attrs({
					'width': this.icicleWidth + this.margin.right + this.margin.left,
					'height': this.icicleHeight + this.margin.top + this.margin.bottom,
				})
		},

		update_maxlevels(data){
			let levels = data['level']
			for (const [key, value] of Object.entries(levels)) {
				if(this.maxLevel < value){
					this.maxLevel = value
					this.level = [0, value]
				}	
            }
		},

		// TODO: Need to make level view for the icicle plot. 
		update_level(){
			this.clearIcicles()
			let ret = []
			// console.log("Number of children: ", this.path_hierarchy)
			this.minLevel = this.level[0]
			this.maxLevel = this.level[1]

			// console.log(this.minLevel, this.maxLevel)
			if (this.minLevel > this.maxLevel){
				console.log("Cannot generate icicle plot, min_level > max_level")
				return 
			}

			for(let i = 0; i < this.path_hierarchy.length; i += 1){
				let level = this.path_hierarchy[i][0].length
				if(level == 1){
					ret.push(this.path_hierarchy[i])
				}
				else if(level >= this.minLevel || level < this.maxLevel){
					ret.push(this.path_hierarchy[i])					
				}
				else{
				}
			}
			this.path_hierarchy = ret
			// console.log("Number of children: ", this.path_hierarchy)

			const json = this.buildHierarchy(this.path_hierarchy)
			this.drawIcicles(json)
		},

		update_from_df(hierarchy) {
			const path = hierarchy['path']
			const inc_time = hierarchy['time (inc)']
			const exclusive = hierarchy['time']
			const imbalance_perc = hierarchy['imbalance_perc']
			const name = hierarchy['name']
			// const exit = hierarchy.exit;
			// const component_path = hierarchy.component_path;
			for (const i in path) {
				if (path.hasOwnProperty(i)) {
					this.path_hierarchy[i] = []
					this.path_hierarchy[i].push(path[i])
					this.path_hierarchy[i].push(inc_time[i])
					this.path_hierarchy[i].push(exclusive[i])
					// this.path_hierarchy[i].push(imbalance_perc[i])
					this.path_hierarchy[i].push(name[i])
					// path_hierarchy_format[i].push(exit[i]);
					// path_hierarchy_format[i].push(component_path[i]);
				}
			}
			const json = this.buildHierarchy(this.path_hierarchy)
			this.drawIcicles(json)
		},

		trunc(str, n) {
			return (str.length > n) ? str.substr(0, n - 1) + '...' : str;
		},

		buildHierarchy(csv) {
			const root = {
				name: ['root'],
				children: []
			};
			for (let i = 0; i < csv.length; i++) {
				const sequence = csv[i][0];
				const inc_time = csv[i][1];
				const exclusive = csv[i][2];
				// const imbalance_perc = csv[i][3];
				const name = csv[i][4]
				// const exit = csv[i][4];
				// const component_path = csv[i][5];
				const parts = sequence;
				let currentNode = root;
				console.log(parts)
				for (let j = 0; j < parts.length; j++) {
					const children = currentNode.children;
					let nodeName = parts[j];
					// if(nodeName.includes('=')){
						// nodeName = nodeName.split('=')[0]
					// }
					var childNode;
					if (j + 1 < parts.length) {
						// Not yet at the end of the sequence; move down the tree.
						let foundChild = false;
						for (let k = 0; k < children.length; k++) {
							if (children[k].name == nodeName) {
								childNode = children[k];
								foundChild = true;
								break;
							}
						}
						// If we don't already have a child node for this branch, create it.
						if (!foundChild) {
							childNode = {
								name: nodeName,
								children: []
							};
							children.push(childNode);
						}
						currentNode = childNode;
					} else {
						// Reached the end of the sequence; create a leaf node.
						childNode = {
							name: nodeName,
							value: inc_time,
							exclusive: exclusive,
							// imbalance_perc,
							length: parts.length,
							count: j,
							// exit,
							// component_path,
							children: [],
						};
						children.push(childNode);
					}
				}
			}
			return root;
		},

		clear(){
			// this.clearIcicles()
		},

		clearIcicles() {
			d3.selectAll('.icicleNode').remove()
			d3.selectAll('.icicleText').remove()
		},

		textSize(text) {
			const container = d3.select('#' + this.id).append('svg');
            container.append('text')
                .attrs({
                    x: -99999,
                    y: -99999
                })
                .text((d) => text);
            const size = container.node().getBBox();
            container.remove();
            return {
                width: size.width,
                height: size.height
            };
		},

		descendents(root) {
			let nodes = [];
			let queue = []
			queue.push(root)
			nodes.push(root)
			while (queue.length != 0) {
				root = queue.pop()
				if (root.children == undefined) {
					continue
				}
				root.children.forEach(function (node) {
					nodes.push(node);
					queue.push(node)
				});
			}
			return nodes;
		},

		drawIcicles(json) {
			json = json.children[0]
			if (this.hierarchy != undefined) {
				this.clearIcicles();
			} else {
				this.setupSVG()
				this.hierarchy = this.hierarchySVG.append('g')
					.attrs({
						'id': this.icicleSVGid
					})
			}
			// Total size of all segments; we set this later, after loading the data
			console.log(json)
			let root = d3.hierarchy(json)
			console.log(root)
				
			const partition = d3.partition()
				.size([this.width, this.height])

			// Setup the view components
			// this.initializeBreadcrumbTrail();
			//  drawLegend();
			d3.select('#togglelegend').on('click', this.toggleLegend);

			// Bounding rect underneath the chart, to make it easier to detect
			// when the mouse leaves the parent g.
			this.hierarchy.append('svg:rect')
				.attr('width', () => {
					if (this.selectedDirection == 'LR') return this.icicleHeight;
					return this.width;
				})
				.attr('height', () => {
					if (this.selectedDirection == 'LR') return this.width - 50;
					return this.height - 50;
				})
				.style('opacity', 0)

			let partitionRoot = partition(root)

			// For efficiency, filter nodes to keep only those large enough to see.
			this.nodes = this.descendents(partitionRoot)
				// .filter(d => {
				// 	console.log(d)
				// 	console.log(d.data.name, d.value)
				// 	if(this.selectedDirection == 'TD'){
				// 		console.log(d.y1, d.y0)
				// 		return (d.y1 - d.y0 > 0.5)
				// 	}
				// 	else{
				// 		console.log(d.x1, d.x0)
				// 		return (d.x1 - d.x0 > 0.5)
				// 	}
				// });

			this.addNodes()
			this.addText()

			// Add the mouseleave handler to the bounding rect.
			d3.select('#container').on('mouseleave', this.mouseleave);

			// Get total size of the tree = value of root node from partition.
			this.totalSize = root.value;
			
		},

		addNodes() {
			this.hierarchy
				.selectAll('.icicleNode')
				.data(this.nodes)
				.enter()
				.append('rect')
				.attr('class', 'icicleNode')
				.attr('x', (d) => {
					if (this.selectedDirection == 'LR') {
						if(Number.isNaN(d.y0)){
							return d.data.count * this.width/d.data.length
						}
						return d.data.count * this.width/d.data.length
					}
					return d.x0;
				})
				.attr('y', (d) => {
					if (this.selectedDirection == 'LR') {
						return d.x0;
					}
					return d.y0;
				})
				.attr('width', (d) => {
					if (this.selectedDirection == 'LR') {
						console.log(d)
						if(Number.isNaN(d.y1 - d.y0)){
							return this.width/d.data.length
						}
						else{
							return d.y1 - d.y0;
						}
						// return this.width/d.data.length
					}
					// return d.x1 - d.x0;
					return this.width
				})
				.attr('height', (d) => {
					if (this.selectedDirection == 'LR') {
						return d.x1 - d.x0;
					}
					return d.y1 - d.y0;
				})
				.style('fill', (d) => {
					if(d.data.value == 0){
						return '#e1e1e1'
					}
					let color = this.$store.color.getColor(d.data);
					return color;
				})
				.style('stroke', () => '#0e0e0e')
				.style('stroke-width', d => '1px')
				.style('opacity', (d) => {
					if (d.exit) {
						return 0.5;
					}
					return 1;
				})
				.on('click', this.click)
				.on('mouseover', this.mouseover);
		},

		addText() {
			this.hierarchy.selectAll('.icicleText')
				.data(this.nodes)
				.enter()
				.append('text')
				.attr('class', 'icicleText')
				.attr('transform', (d) => {
					if (this.selectedDirection == 'LR') {
						return 'rotate(90)';
					}
					return 'rotate(0)';
				})
				.attr('x', (d) => {
					if (this.selectedDirection == 'LR') {
						if(Number.isNaN(d.y0)){
							return d.data.count * this.width/d.data.length
						}
						return d.data.count * this.width/d.data.length
						// return d.y0 * len(d.component_path);
					}
					return d.x0 + 15;
				})
				.attr('y', (d) => {
					if (this.selectedDirection == 'LR') {
						return d.x0;
					}
					return d.y0 + 15;
				})
				.attr('width', (d) => {
					if (this.selectedDirection == 'LR') {
						if (Number.isNaN(d.y1 - d.y0)){
							return this.width/d.data.length
						}
						// return d.y1 - d.y0 / 2;
						return this.width/d.data.length

					}
					console.log(d)
					// return d.x1 - d.x0 / 2;
					return this.width
				})
				.style('fill', (d) => {
					let color = this.$store.color.setContrast(this.$store.color.getColor(d))
					return color
				})
				.text((d) => {
					if (d.y1 - d.y0 < 10 || d.x1 - d.x0 < 50) {
						return '';
					}

					let name = d.data.name
					var textSize = this.textSize(name)['width'];
                    if (textSize < d.height) {
                        return name;
                    } else {
                        return this.trunc(name, this.textTruncForNode)
                    }
				});
		},

		click(d){
			let splitByOption = this.selectedSplitOption.name

			// Fade all the segments.
			d3.selectAll('.icicleNode')
				.style('opacity', 0.3)

			let sequenceArray = this.getAncestors(d);
			// Then highlight only those that are an ancestor of the current segment.
			this.hierarchy.selectAll('.icicleNode')
				.filter(node => {
					return (sequenceArray.indexOf(node) >= 0)
				})
				.style('opacity', 1);
				
			this.$socket.emit(splitByOption, {
				// "module":
			})
		},

		// Restore everything to full opacity when moving off the visualization.
		mouseleave() {
			// Hide the breadcrumb trail
			d3.select('#trail')
				.style('visibility', 'hidden');

			// Deactivate all segments during transition.
			d3.selectAll('.icicleNode').on('mouseover', null);

			// Transition each segment to full opacity and then reactivate it.
			d3.selectAll('.icicleNode')
				.transition()
				.duration(1000)
				.style('opacity', 1)
				.each('end', function () {
					d3.select(this).on('mouseover', mouseover);
				});
		},

		// Fade all but the current sequence, and show it in the breadcrumb trail.
		mouseover(d) {
			console.log(d.data.name)
			const percentage = (100 * d.value / this.totalSize).toPrecision(3);
			let percentageString = `${percentage}%`;
			if (percentage < 0.1) {
				percentageString = '< 0.1%';
			}

			const sequenceArray = this.getAncestors(d);
			this.updateBreadcrumbs(sequenceArray, percentageString);

			// Fade all the segments.
			d3.selectAll('.icicleNode')
				.style('opacity', 0.3);

			// Then highlight only those that are an ancestor of the current segment.
			this.hierarchy.selectAll('.icicleNode')
				.filter(node => (sequenceArray.indexOf(node) >= 0))
				.style('opacity', 1);
		},

		// Given a node in a partition layout, return an array of all of its ancestor
		// nodes, highest first, but excluding the root.
		getAncestors(node) {
			const path = []
			let current = node
			while (current.parent) {
				path.unshift(current)
				current = current.parent
			}
			path.unshift(current)
			return path;
		},

		initializeBreadcrumbTrail() {
			// Add the svg area.
			const width = document.getElementById(this.icicleSVGid).clientWidth;
			const trail = d3.select('#sequence').append('svg:svg')
				.attr('width', this.icicleWidth)
				.attr('height', 50)
				.attr('id', 'trail');
			// Add the label at the end, for the percentage.
			trail.append('svg:text')
				.attr('id', 'endlabel')
				.style('fill', '#000');
		},

		// Generate a string that describes the points of a breadcrumb polygon.
		breadcrumbPoints(i) {
			const points = [];
			points.push('0,0');
			points.push(`${this.b.w},0`);
			points.push(`${this.b.w + this.b.t},${this.b.h / 2}`);
			points.push(`${this.b.w},${this.b.h}`);
			points.push(`0,${this.b.h}`);
			if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
				points.push(`${this.b.t},${this.b.h / 2}`);
			}
			return points.join(' ');
		},

		// Update the breadcrumb trail to show the current sequence and percentage.
		updateBreadcrumbs(nodeArray, percentageString) {
			// Data join; key function combines name and depth (= position in sequence).
			const g = d3.select('#trail')
				.selectAll('g')
				.data(nodeArray, d => d.name + d.depth);

			// Add breadcrumb and label for entering nodes.
			const entering = g.enter().append('svg:g');

			entering.append('svg:polygon')
				.attr('points', this.breadcrumbPoints)
				.style('fill', () => '#f1f1f1');

			entering.append('svg:text')
				.attr('x', (this.b.w + this.b.t) / 2)
				.attr('y', this.b.h / 2)
				.attr('dy', '0.35em')
				.attr('text-anchor', 'middle')
				.text(d => d.name);

			// Set position for entering and updating nodes.
			g.attr('transform', (d, i) => `translate(${i * (this.b.w + this.b.s)}, 0)`);

			// Remove exiting nodes.
			g.exit().remove();

			// Now move and update the percentage at the end.
			d3.select('#trail').select('#endlabel')
				.attr('x', (nodeArray.length + 0.5) * (this.b.w + this.b.s))
				.attr('y', this.b.h / 2)
				.attr('dy', '0.35em')
				.attr('text-anchor', 'middle')
				.text(percentageString);

			// Make the breadcrumb trail visible, if it's hidden.
			d3.select('#trail')
				.style('visibility', '');
		},

		toggleLegend() {
			const legend = d3.select('#legend');
			if (legend.style('visibility') == 'hidden') {
				legend.style('visibility', '');
			} else {
				legend.style('visibility', 'hidden');
			}
		},
	}
}