import preprocess from './callflow/preprocess.js'
import DOMSetup from './callflow/DOMSetup.js'
import sankeyComputation from './callflow/sankeyComputation.js'
import drawEdges from './callflow/edges.js'
import { drawNodes, clearNodes } from './callflow/nodes.js'
import { drawHierarchy } from './callflow/hierarchy.js'
import drawHistogram from './callflow/histogram.js'
import Color from './callflow/color.js'
import ControlUI from './control_wrapper.js'

export default class CallFlow{
    constructor(graph, prop) {
        // View properties
        this.view = {}
        this.view.ySpacing = 50
        this.view.nodeWidth = 50
        this.view.containerID = prop.ID
        this.view.minHeightForText = 10
        this.view.margin = prop.margin || { top: 100, right: 30, bottom: 10, left: 10 }
        this.view.width = (prop.width || 900) - this.view.margin.left - this.view.margin.right
        this.view.height = (prop.height || 900) - this.view.margin.top - this.view.margin.bottom
	    this.view.treeHeight = this.view.transitionDuration = 1000
        this.view.color = null
	    this.view.minNodeScale = 1.0
        
        // Data properties 
        this.graph = graph
        this.toolTipData = prop.toolTipData || null
        this.histogramData = prop.histogramData || null
        this.rootRunTime = []

        //Function calls
        //        this.resetStat()
        this.graph = preprocess(this.graph)
        this.view = DOMSetup(this.view)
        this.view.sankey = sankeyComputation(this.graph, this.view)
        this.setColor(1)
        this.render()
	    let controlUI =  new ControlUI(this.graph, this.view)
//        this.renderCCTBtn()
        return this
    }
}

CallFlow.prototype.renderCCTBtn = function(){
    var render_button= $('<input type="button" id="renderCCTBtn" value="Render CCT"/>');        
    $('#control').append(render_button)
    $('#renderCCTBtn').click(function(){
        getCCT().then((data) => {
            
        })
    })
}


CallFlow.prototype.setColor = function(colorOption){
	this.view.colorOption = colorOption
	this.view.color = new Color(this.view)
	this.view.color.setColorScale(this.graph.stat.minInc, this.graph.stat.maxInc, this.graph.stat.minExc, this.graph.stat.maxExc)
}

CallFlow.prototype.render = function(){
    drawNodes(this.graph, this.view)
    drawEdges(this.graph, this.view)
    drawHistogram(this.graph, this.view)
    drawHierarchy(this.graph, this.view)
}

CallFlow.prototype.clear = function(){
    $('#procedure_view').empty()
}

CallFlow.prototype.softrender = function(){
    clearNodes(this.view)
    drawNodes(this.graph, this.view)
}

CallFlow.prototype.update = function(){
    this.refresh = true
    this.graph = preprocess(this.graph, this.refresh)
    this.render()
}