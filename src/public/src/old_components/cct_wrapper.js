/* eslint-disable no-undef */
/* eslint-disable func-names */
import preprocess from './callflow/preprocess';
import DOMSetup from './callflow/DOMSetup';
import CCTComputation from './CCT/computation';
import sankeyComputation from './callflow/sankeyComputation';
import { drawNodes, clearNodes } from './CCT/nodes';
import drawEdges from './CCT/edges';
import { drawNodes_force, clearNodes_force, drawEdges_force } from './CCT/nodes_force';
import { drawHierarchy } from './callflow/hierarchy';
import drawHistogram from './callflow/histogram';
import Color from './callflow/color';
import ControlUI from './control_wrapper';

export default class CCT {
    constructor(graph, prop) {
        // View properties
        this.view = {};
        this.view.ySpacing = 50;
        this.view.nodeWidth = 50;
        this.view.containerID = prop.ID;
        this.view.minHeightForText = 10;
        this.view.margin = {
 top: 10, right: 30, bottom: 10, left: 10 
};
        this.view.width = (prop.width) - this.view.margin.left - this.view.margin.right;
        this.view.height = (prop.height) - this.view.margin.top - this.view.margin.bottom;
	    this.view.treeHeight = this.view.transitionDuration = 1000;
        this.view.color = null;
	    this.view.minNodeScale = 1.0;

        // Data properties
        this.graph = graph;
        this.toolTipData = prop.toolTipData || null;
        this.histogramData = prop.histogramData || null;
        this.rootRunTime = [];

        // Function calls
        //        this.resetStat()
        this.graph = preprocess(this.graph);
        this.view = DOMSetup(this.view);
        this.view.layout = 'sankey';
        if (this.view.layout == 'sankey') {
            this.view.cct = sankeyComputation(this.graph, this.view);
        } else if (this.view.layout == 'force') {
            this.view.cct = CCTComputation(this.graph, this.view);
        }
        this.setColor(5);
        // this.render()
        this.render_force();
        return this;
    }
}

CCT.prototype.setColor = function (colorOption) {
    this.view.colorOption = colorOption;
    this.view.color = new Color(this.view);
    this.view.color.setColorScale(this.graph.stat.minInc, this.graph.stat.maxInc, this.graph.stat.minExc, this.graph.stat.maxExc);
};

CCT.prototype.render = function () {
    drawNodes(this.graph, this.view);
    drawEdges(this.graph, this.view);
    drawHistogram(this.graph, this.view);
    drawHierarchy(this.graph, this.view);
};

CCT.prototype.render_force = function () {
    drawNodes_force(this.graph, this.view);
    drawEdges_force(this.graph, this.view);
};

CCT.prototype.clear = function () {
    $('#cct_view').empty();
};

CCT.prototype.softrender = function () {
    clearNodes(this.view);
    drawNodes(this.graph, this.view);
};

CCT.prototype.update = function () {
    this.refresh = true;
    this.graph = preprocess(this.graph, this.refresh);
    this.render();
};