import tpl from '../html/callgraph.html'
import preprocess from './callgraph/preprocess'
import Sankey from './callgraph/sankey'
import Nodes from './callgraph/nodes'
import Edges from './callgraph/edges'

import * as  d3 from 'd3'
import Color from '../old_components/callflow/color';
// import { behavior } from 'd3-behavior'

export default {
  name: 'Callgraph',
  template: tpl,
  components: {
    Nodes,
    Edges,
  },

  props: [
    // 'data'
  ],

  data: () => ({
    graph: null,
    id: 'callgraph_overview',
    sankey: {
      nodeWidth: 50,
      xSpacing: 0,
      ySpacing: 50,
      nodeScale: 1.0,
    },
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
    colorOption: 1
  }),

  watch: {

  },

  mounted() {
    this.id = this.id
  },

  methods: {
    init(data) {
      this.width = 900 - this.margin.left - this.margin.right
      this.height = 900 - this.margin.top - this.margin.bottom
      d3.select('#' + this.id)
        .attr('class', 'sankey')
        .attr('width', this.width + this.margin.left + this.margin.right)
        .attr('height', this.height + this.margin.top + this.margin.bottom)

      // this.zoom = behavior.zoom()
      //   .scaleExtent([0.1, 1])
      //   .on('zoom', () => {
      //       //	    let tx = Math.min(0, Math.min(d3.event.translate[0], view.width + view.width*d3.event.scale))
      //       //	    let ty = Math.min(0, Math.min(d3.event.translate[1], view.height + view.height*d3.event.scale))
      //       //	    view.svgBase.attr("transform", "translate(" + [tx, ty]  + ")scale(" + d3.event.scale + ")");
      //     view.svgBase.attr('transform', `translate(${d3.event.translate})scale(${d3.event.scale})`);
      // });

      // need to clean this up still
      this.data = preprocess(data, false)
      this.sankey = this.initSankey(this.data)
      this.postProcess(this.data.nodes, this.data.links)
      
      // Set color scales
      this.view.color = new Color(this.colorOption)
      this.view.color.setColorScale(this.data.stat.minInc, this.data.stat.maxInc, this.data.stat.minExc, this.data.stat.maxExc)

      this.render()
    },

    //Sankey computation
    initSankey() {
      let sankey = Sankey()
        .nodeWidth(this.sankey.nodeWidth)
        .nodePadding(this.sankey.ySpacing)
        .size([this.width * 1.05, this.height - this.sankey.ySpacing])
        .xSpacing(this.sankey.xSpacing)
        //    .setReferenceValue(this.data.rootRunTimeInc)
        .setMinNodeScale(this.sankey.nodeScale);

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
      this.computeNodeBreadths(temp_nodes, temp_edges);

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
      while (remainingNodes.length) {
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
      }
    },

    render() {
      this.$refs.Nodes.init(this.data, this.view)
      this.$refs.Edges.init(this.data, this.view)

    },

    clear() {
      //   this.$refs.Sankey.clear()
    },

    update() {
      //   this.$refs.Sankey.tick()
    },
  }
}
