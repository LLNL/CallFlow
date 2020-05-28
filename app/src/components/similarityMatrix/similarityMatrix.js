import * as d3 from "d3";
import "d3-selection-multi";
import adjacencyMatrixLayout from "../../thirdParty/d3-adjacency-matrix-layout";
import template from "../../html/similarityMatrix/index.html";
// import LiveMatrixColormap from './LiveMatrixColormap'
import EventHandler from "../EventHandler";


export default {
	name: "SimilarityMatrix",
	template: template,
	props: [],
	components: {
		// LiveMatrixColormap
	},
	data: () => ({
		id: null,
		data: null,
		view: null,
		vis: null,
		container: null,
		height: 0,
		width: 0,
		message: "DeltaCon Similarity Matrix",
		matrix: null,
		matrixScale: 0.7,
		offset: 10,
		colorSet: ["#5576A5", "#E8CA4F", "#AB769F"],
		clusterIds: [],
		scaleKpCount: 16,
		pes: 0,
		max_weight: 0,
		min: 100,
		firstRender: true,
		margin: {
			top: 10,
			right: 10,
			bottom: 10,
			left: 15
		},
	}),
	sockets: {
		ensemble_similarity(data) {
			console.log("Similarities: ", data);
			this.processSimilarityMatrix(data);
		}
	},
	watch: {
	},

	mounted() {
		this.id = "similarity-matrix-view";
	},

	methods: {
		init() {
			this.toolbarHeight = document.getElementById("toolbar").clientHeight;
			this.footerHeight = document.getElementById("footer").clientHeight;
			this.width = window.innerWidth * 0.2;
			this.height = (window.innerHeight - this.toolbarHeight - this.footerHeight) * 0.5;

			this.containerWidth = this.width - this.margin.right - this.margin.left;
			this.containerHeight = this.height - this.margin.top - this.margin.bottom;

			this.svg = d3.select("#" + this.id)
				.attr("width", this.width - this.margin.left - this.margin.right)
				.attr("height", this.height - this.margin.top - this.margin.bottom)
				.attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

			this.matrixLength = Math.min(this.containerHeight, this.containerWidth);
			this.matrixWidth = this.matrixLength * this.matrixScale;
			this.matrixHeight = this.matrixLength * this.matrixScale;
			// this.$refs.LiveMatrixColormap.init('live-kpmatrix-overview')
			console.log("Similarity matrix started");
		},


		processSimilarityMatrix(data) {
			this.similarityMatrix = [];
			let mat = [];

			this.datasetMap = {};
			this.datasetRevMap = {};
			let idx = 0;
			for (var dataset in data) {
				if (data.hasOwnProperty(dataset)) {
					this.datasetMap[dataset] = idx;
					this.datasetRevMap[idx] = dataset;
					idx += 1;
				}
			}

			let count = 0;
			for (let dataset in data) {
				if (data.hasOwnProperty(dataset)) {
					let similarity = data[dataset];
					for (let i = 0; i < similarity.length; i += 1) {
						if (this.similarityMatrix[count] == undefined) {
							this.similarityMatrix[count] = [];
						}
						this.similarityMatrix[count][i] = {
							x: count,
							j: i,
							z: similarity[i],
							id_x: this.datasetMap[dataset],
							id_y: i
						};
					}
					count += 1;
				}
			}
			this.visualize();
		},


		reset() {
			if (this.firstRender) {
				this.addDummySVG();
				this.firstRender = false;
			}

			this.visualize();
		},

		addDummySVG() {
			let kpMatrixHeight = document.getElementsByClassName(".KpMatrix0").clientHeight;
			this.svg = d3.select("#" + this.id)
				.append("svg")
				.attrs({
					transform: `translate(${0}, ${0})`,
					width: this.matrixLength,
					height: 0.5 * (this.containerHeight - this.matrixHeight - this.chipContainerHeight),
				});
		},

		brush() {
			this.x = d3.scaleLinear()
				.domain([0, this.pes])
				.range([0, this.matrixWidth]);

			this.y = d3.scaleLinear()
				.domain([this.pes, 0])
				.range([this.matrixHeight, 0]);

			this.drag = d3.brush()
				.extent([[0, 0], [this.matrixWidth, this.matrixHeight]])
				.on("brush", this.brushing)
				.on("end", this.brushend);
		},

		visualize() {
			this.nodeWidth = (this.matrixWidth / this.similarityMatrix.length);
			this.nodeHeight = (this.matrixHeight / this.similarityMatrix.length);

			let adjacencyMatrix = adjacencyMatrixLayout()
				.size([this.matrixWidth, this.matrixHeight])
				.useadj(true)
				.adj(this.similarityMatrix);

			let matrixData = adjacencyMatrix();

			if (!Number.isNaN(matrixData[0].x)) {
				this.max_weight = 0;
				this.min_weight = 0;
				for (let i = 0; i < matrixData.length; i += 1) {
					this.max_weight = Math.max(this.max_weight, matrixData[i].weight);
					this.min_weight = Math.min(this.min_weight, matrixData[i].weight);
				}

				// this.$refs.LiveMatrixColormap.clear()
				// this.$refs.LiveMatrixColormap.render(this.min_weight, this.max_weight)


				d3.selectAll(".KpMatrix").remove();
				this.svg = d3.select("#" + this.id)
					.append("svg")
					.attrs({
						transform: `translate(${5}, ${0})`,
						width: this.matrixWidth,
						height: this.matrixHeight,
						class: "KpMatrix",
					});

				this.svg.selectAll(".rect")
					.data(matrixData)
					.enter()
					.append("rect")
					.attrs({
						class: (d, i) => "rect similarityRect-" + d.source,
						// id: (d, i) => 'similarityRect-' + d.source,
						"width": (d) => this.nodeWidth,
						"height": (d) => this.nodeHeight,
						"x": (d) => d.x,
						"y": (d) => d.y,
					})
					.style("stroke", (d, i) => {
						return "black";
					})
					.style("stroke-width", (d, i) => {
						return "0.1px";
					})
					.style("stroke-opacity", 1)
					.style("fill", d => {
						let val = (d.weight) / (this.max_weight);
						return d3.interpolateGreys(1 - val);
					})
					.style("fill-opacity", d => {
						return 1;
					})
					.on("click", d => {
						let highlight_datasets = [];
						let source_dataset = this.$store.actual_dataset_names[d.source];
						let target_dataset = this.$store.actual_dataset_names[d.target];
						highlight_datasets.push(source_dataset);
						highlight_datasets.push(target_dataset);
						EventHandler.$emit("highlight_datasets", highlight_datasets);
					})
					.on("mouseover", d => {

					})
					.on("mouseout", (d) => {

					});

				d3.select(".KpMatrix")
					.call(adjacencyMatrix.xAxis);

				d3.select(".KpMatrix")
					.call(adjacencyMatrix.yAxis);

				this.highlight_dataset(this.$store.selectedTargetDataset);
			}
		},

		highlight_dataset(dataset) {
			let dataset_idx = this.datasetMap[dataset];
			let self = this;
			d3.selectAll(".similarityRect-" + dataset_idx)
				.style("stroke", (d, i) => {
					return self.$store.color.target;
				});
			// .style('stroke-width', (d, i) => {
			//     return this.nodeWidth/3
			// })

		},

		clear() {

		},
	}
};

