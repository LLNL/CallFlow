export default class CallFlow{
    constructor(graph, prop) {
        // View properties
        this.xSpacing = 1
        this.ySpacing = 50
        this.nodeWidth = 50
        this.containerID = prop.ID
        this.margin = prop.margin || { top: 10, right: 30, bottom: 10, left: 10 }
        this.width = (prop.width || 900) - prop.margin.left - prop.margin.right
        this.height = prop.height || 900 - prop.margin.top - prop.margin.bottom
        this.svg = null 

        // Data properties 
        this.graph = graph
        this.toolTipData = prop.toolTipData || null
        this.histogramData = prop.histogramData || null
        this.rootRunTime = []

        
        //Function calls
        this.resetStat()
        this.preprocess(graph)
        this.DOMSetup()
        this.SankeyComputation()
    }
}

CallFlow.prototype.preprocess = function(graph){
    graph.edges.forEach((edge) => {
	    let label = edge['sourceInfo'].name;
        let graphID = edge['sourceInfo'].label;
	    if(label == '<program root>'){
	        if(this.rootRunTime[graphID] == undefined){
		        this.rootRunTime[graphID] = 0;
	        }
	        this.rootRunTime[graphID] += edge["value"];
	    }
    })


    let outGoing = [];
	let inComing = [];
    graph.nodes.forEach((node) => {
	    let nodeLabel = node["lmID"];
        
	    graph.edges.forEach((edge) => {
            let graphID = edge['sourceInfo'].label;
	        if(edge["sourceInfo"].label == nodeLabel){
		        if(outGoing[graphID] == undefined){
		            outGoing[graphID] = 0;
		        }
		        outGoing[graphID] += edge["value"];
	        }
        });
        
        graph.edges.forEach((edge) => {
            let graphID = edge['targetInfo'].label;
	        if(edge["targetInfo"].label == nodeLabel){
		        if(inComing[graphID] == undefined){
		            inComing[graphID] = 0;
		        }
		        inComing[graphID] += edge["value"];
	        }
	    })

	    if(outGoing[nodeLabel] == undefined){
	        outGoing[nodeLabel] = 0;
	    }

	    if(inComing[nodeLabel] == undefined){
	        inComing[nodeLabel] = 0;
	    }
	    
	    node["out"] = outGoing[nodeLabel];
	    node["in"] = inComing[nodeLabel];

	    node["inclusive"] = Math.max(inComing[nodeLabel], outGoing[nodeLabel]);
	    node["exclusive"] = Math.max(inComing[nodeLabel], outGoing[nodeLabel]) - outGoing[nodeLabel];

	    this.calcStat(node["inclusive"], node["exclusive"])
    });

    let stat = {
	    "inTimeMin" : Number.MAX_SAFE_INTEGER,
	    "inTimeMax" : 0,
	    "exTimeMin" : Number.MAX_SAFE_INTEGER,
	    "exTimeMax" : 0,
	    "imPercMin" : Number.MAX_SAFE_INTEGER,
	    "imPercMax" : 0
    };

    // For now I am changing inTime to inc, exTime to exc. Not sure if this is needed. 
    graph.nodes.forEach((data) => {
	    stat["inTimeMin"] = Math.min(stat["inTimeMin"], data["inc"]);
	    stat["inTimeMax"] = Math.max(stat["inTimeMax"], data["inc"]);
	    stat["exTimeMin"] = Math.min(stat["exTimeMin"], data["exc"]);
	    stat["exTimeMax"] = Math.max(stat["exTimeMax"], data["exc"]);
//	    stat["imPercMin"] = Math.min(stat["imPercMin"], data["imPerc"]);
//	    stat["imPercMax"] = Math.max(stat["imPercMax"], data["imPerc"]);
    });
}

CallFlow.prototype.calcStat = function(inTime, exTime){
	this.maxInc = Math.max(this.maxInc, inTime);
	this.minInc = Math.min(this.minInc, inTime);
	this.maxExc = Math.max(this.maxExc, exTime);
	this.minExc = Math.min(this.minExc, exTime);
}


CallFlow.prototype.resetStat = function(){
    this.maxInc = 0;
	this.minInc = Number.MAX_SAFE_INTEGER;
	this.maxExc = 0;
	this.minExc = Number.MAX_SAFE_INTEGER;
}

//Initial set up of DOM elements. 
CallFlow.prototype.DOMSetup = function(){
    //Zoom behavior
    let zoom = d3.behavior.zoom()
        .scaleExtent([0.1, 10])
        .on('zoom', () => {
	        svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        })
    
    let svg = d3.select(this.containerID).append('svg')
        .attr('class','sankey1')
        .attr('width', this.width + this.margin.left + this.margin.right)
        .attr('height', this.height + this.margin.top + this.margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')')
        .call(zoom)

    // Invisible svg to capture mouse events
    let isvg = svg.append('rect')
        .attr('id', 'invisibleSVG')
        .attr('width', this.width)
        .attr('height', this.height)
        .style('fill', 'none')
        .style('pointer-events', 'all')
    

    let defs = svg.append('defs')
    let links = svg.append('g')
    let histograms = svg.append('g')
    let nodes = svg.append('g')

    // ToolTip
	let toolTip = d3.select(this.containerID)
	    .append('div')
	    .attr('class', 'toolTip')
	    .style('position', 'absolute')
	    .style('padding', '5px 10px 0px 10px')
	    .style('opacity', 0)
	    .style('background', 'white')
	    .style('height', 'auto')
	    .style('width', 'auto')
	    .style('border-radius', '10px')
	    .style('border-width', '1px')
	    .style('border-style', 'solid')
	    .style('position', 'absolute');
	let toolTipText = toolTip
	    .append('p')
	    .style('font-family', 'sans-serif')
	    .style('font-size', '13px');
	let toolTipList = toolTip.append('svg');
	toolTipList.attr('width', "400px")
	    .attr('height', "150px")
	let toolTipG = toolTipList.append('g')
	    .attr("transform", "translate(" + 5 + "," + 5 + ")");    

}

CallFlow.prototype.sankeyComputation = function(){
	    // Set the sankey diagram properties
	    let sankey = d3sankeySingle()
	        .nodeWidth(this.nodeWidth)
	        .nodePadding(this.ySpacing)
            .size([this.width * 1.05, this.height - this.ySpacing])
	        .xSpacing(this.xSpacing)
	        .setReferenceValue(this.rootRunTime);
        
	    let path = sankey.link();
        
	    let graph = this.buildGraph(this.graph.nodes, this.graph.edges);
	    sankey.nodes(this.graph.nodes)
	        .links(this.graph.edges)
	        .layout(32);	
    }
}

CallFlow.prototype.buildGraph = function(nodes, edges) {
    let temp_nodes = nodes.slice()
    let temp_edges = edges.slice()

    computeNodeLinks(temp_nodes, temp_edges)
    computeNodeBreadths(temp_nodes, temp_edges)

    for (var i = 0; i < temp_links.length; i++) {
        let source = temp_links[i].sourceID;
        let target = temp_links[i].targetID;
        let source_x = nodes[source].x
        let target_x = nodes[target].x
        let dx = target_x - source_x

        // Put in intermediate steps
        for (let j = dx; 1 < j; j--) {
            let intermediate = nodes.length
            let tempNode = {
                sankeyID: intermediate,
                name: "intermediate",
                // runTime: nodes[i].runTime
            }
            nodes.push(tempNode)
            links.push({
                source: intermediate,
                target: (j == dx ? target : intermediate-1),
                value: links[i].value
            })
            if (j == dx) {
                links[i].original_target = target
                links[i].last_leg_source = intermediate
            }
            links[i].target = intermediate
        }
    }

    return {
        nodes: nodes,
        links: links
    }
}
