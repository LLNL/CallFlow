import tpl from '../html/diffgraph.html'
import preprocess from './diffgraph/preprocess'
import Sankey from './diffgraph/sankey'
import Nodes from './diffgraph/nodes'
// import IntermediateNodes from './callgraph/intermediateNodes'
import MiniHistograms from './diffgraph/miniHistograms'
import Edges from './diffgraph/edges'
import * as  d3 from 'd3'

export default {
    name: 'Diffgraph',
    template: tpl,
    components: {
        Nodes,
		// IntermediateNodes,
		Edges,
		MiniHistograms,
    },
    props: [
       
    ],
    data: () => ({
        graph: null,
        id: 'diffgraph-overview',
        margin: {
            top: 30, right: 30, bottom: 10, left: 10
        },
        view: {
            color: null,
        },
        width: null,
        height: null,
        treeHeight: null,
        color: null,
        colorOption: null,
    }),

    watch: {

    },

    mounted() {
        this.id = this.id
    },

    methods: {
        init(data) {
            this.toolbarHeight = document.getElementById('toolbar').clientHeight
			this.footerHeight = document.getElementById('footer').clientHeight
			this.width = window.innerWidth*0.7 - this.margin.left - this.margin.right
			this.height = window.innerHeight - this.margin.top - this.margin.bottom - this.toolbarHeight - this.footerHeight
			this.diffSVG = d3.select('#' + this.id)
				.attrs({
					'width': this.width + this.margin.left + this.margin.right,
					"height": this.height + this.margin.top + this.margin.bottom,
					"top": this.toolbarHeight
                })
                
            this.render(data)
        },

     
        lear() {
			this.$refs.Nodes.clear()
			this.$refs.Edges.clear()
			// this.$refs.CallbackEdges.clear()
			this.$refs.MiniHistograms.clear()
		},

		render(data) {
			this.data = preprocess(data, false)
			this.maxLevel = data.maxLevel

			console.log("Preprocessing done.")
			this.d3sankey = this.initSankey()
            console.log("Layout Calculation.")
            console.log(this.data)
			// this.postProcess(this.data.nodes, this.data.links)	
			// console.log("Post-processing done.") 

			// this.$refs.Nodes.init(this.data, this.view)
			// // this.$refs.IntermediateNodes.init(this.data)
			// this.$refs.Edges.init(this.data, this.view)
			// // this.$refs.CallbackEdges.init(this.data, this.view)
			// this.$refs.MiniHistograms.init(this.data, this.view)

		},

		updateMiniHistogram() {
			this.$refs.MiniHistograms.clear()
			this.$refs.MiniHistograms.init(this.data, this.view)
		},

		//Sankey computation
		initSankey() {
			let sankey = Sankey()
				.nodeWidth(this.nodeWidth)
				.nodePadding(this.ySpacing)
				.size([this.width * 1.05, this.height - this.ySpacing])
				.levelSpacing(this.levelSpacing)
				.maxLevel(this.maxLevel)
				//    .setReferenceValue(this.data.rootRunTimeInc)
				.setMinNodeScale(this.nodeScale);

			let path = sankey.link()

			sankey.nodes(this.data.nodes)
				.links(this.data.links)
				.layout(32)
			return sankey
		},

		postProcess(nodes, edges) {
			const temp_nodes = nodes.slice();
			const temp_edges = edges.slice();

			this.computeNodeEdges(temp_nodes, temp_edges);
			console.log("Compute node edges (Post process)")
			this.computeNodeBreadths(temp_nodes, temp_edges)
			console.log("Compute node breadths (Post process)")


			for (let i = 0; i < temp_edges.length; i++) {
				const source = temp_edges[i].sourceID;
				const target = temp_edges[i].targetID;

				if (source != undefined && target != undefined) {
					const source_x = nodes[source].level;
					const target_x = nodes[target].level;
					const dx = target_x - source_x;

					// Put in intermediate steps
					for (let j = dx; j > 1; j--) {
						const intermediate = nodes.length;
						const tempNode = {
							sankeyID: intermediate,
							name: 'intermediate',
							//                    weight: nodes[i].weight,
							//		            height: nodes[i].value
						};
						nodes.push(tempNode);
						edges.push({
							source: intermediate,
							target: (j == dx ? target : intermediate - 1),
							value: edges[i].value,
						});
						if (j == dx) {
							edges[i].original_target = target;
							edges[i].last_leg_source = intermediate;
						}
					}
				}
			}
		},

		computeNodeEdges(nodes, edges) {
			nodes.forEach((node) => {
				node.sourceLinks = [];
				node.targetLinks = [];
			});
			edges.forEach((edge) => {
				let source = edge.sourceID,
					target = edge.targetID;

				if (source != undefined && target != undefined) {
					nodes[source].sourceLinks.push(edge);
					nodes[target].targetLinks.push(edge);
				}
			});

			return {
				nodes,
				edges,
			};
		},

		computeNodeBreadths(nodes, edges) {
			let remainingNodes = nodes.map((d) => d);
			let nextNodes;
			let x = 0;
			let count = 10
			console.log("Bug here. Correct me.")
			while (remainingNodes.length) {
				if(count > 10){
					break;
				}
				nextNodes = [];
				remainingNodes.forEach((node) => {
					node.sourceLinks.forEach((link) => {
						if (nextNodes.indexOf(link.target) < 0) {
							nextNodes.push(link.target);
						}
					});
				});
				remainingNodes = nextNodes;
				++x;
				count += 1
			}
		},
    }
}
