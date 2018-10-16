export default function DOMSetup(view){
    var dragGroup = d3.behavior.drag()
	.on('dragstart', function () {
	    console.log('Start Dragging Group');
	        d3.event.sourceEvent.stopPropagation();
	})
	.on('drag', function (d, i) {
	    d.x += d3.event.dx;
	    d.y += d3.event.dy;
	    d3.select(this).attr("transform", "translate(" + d.x + "," + d.y + ")");
	});    
    
    //Zoom behavior
    let zoom = d3.behavior.zoom()
        .scaleExtent([0.1, 1])
        .on('zoom', () => {
//	    let tx = Math.min(0, Math.min(d3.event.translate[0], view.width + view.width*d3.event.scale))
//	    let ty = Math.min(0, Math.min(d3.event.translate[1], view.height + view.height*d3.event.scale))
//	    view.svgBase.attr("transform", "translate(" + [tx, ty]  + ")scale(" + d3.event.scale + ")");
	    view.svgBase.attr("transform", "translate(" + d3.event.traslate  + ")scale(" + d3.event.scale + ")");
	})    
    
    view.svg = d3.select(view.containerID).append('svg')
        .attr('class','sankey1')
        .attr('width', view.width + view.margin.left + view.margin.right)
        .attr('height', view.height + view.margin.top + view.margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + view.margin.left + ',' + view.margin.top+ ')')
        .call(zoom)
//	.call(dragGroup)

    
    // Invisible svg to capture mouse events
    let isvg = view.svg.append('rect')
        .attr('id', 'invisibleSVG')
        .attr('width', view.width)
        .attr('height', view.height)
        .style('fill', 'none')
        .style('pointer-events', 'all')

    view.svgBase = view.svg.append('g')
    view.svgVis  = view.svgBase.append('g')
    view.defs = view.svgVis.append('defs')
    view.edges = view.svgVis.append('g')
    view.histograms = view.svgVis.append('g')
    view.nodes = view.svgVis.append('g')
    
    // ToolTip
    view.toolTip = d3.select(view.containerID)
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
    view.toolTipText = view.toolTip
	.append('p')
	.style('font-family', 'sans-serif')
	.style('font-size', '13px');
    view.toolTipList = view.toolTip.append('svg');
    view.toolTipList.attr('width', "400px")
	.attr('height', "150px")
    view.toolTipG = view.toolTipList.append('g')
	.attr("transform", "translate(" + 5 + "," + 5 + ")");    

    return view
}
