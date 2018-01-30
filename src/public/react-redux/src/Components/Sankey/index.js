import React, { Component } from 'react'
import { connect } from 'react-redux'
import * as d3 from 'd3'
import ReactFauxDOM from 'react-faux-dom'
import _ from 'lodash'
import * as d3_sankey from 'd3-sankey';

class Sankey extends Component {    
    constructor(){
	super()
	this.state = {
	    nodes: [],
	    links: []
	};
    }

    componentWillReceiveProps(nextProps){
	this.setState({
	    nodes: nextProps.nodes,
	    links: nextProps.links
	});
    }
    
    compoenentWillMount(){

    }
    
    render() {
	// ========================================================================
	// Set units, margin, sizes
	// ========================================================================
	var margin = { top: 10, right: 0, bottom: 10, left: 0 };
	var width = 690 - margin.left - margin.right;
	var height = 400 - margin.top - margin.bottom;

	var units = "Widgets"
	var format = (d) => formatNumber(d) + " " + units
	var formatNumber = d3.format(",.0f")

	// ========================================================================
	// Set the sankey diagram properties
	// ========================================================================
	var sankey = d3_sankey.sankey()
	    .size([width, height])
	    .nodeWidth(15)
	    .nodePadding(10);

	var path = sankey.link();

	var graph = {
	    nodes: _.cloneDeep(this.state.nodes),
	    links: _.cloneDeep(this.state.links)
	};

	sankey.nodes(graph.nodes)
	    .links(graph.links)
	    .layout(32);

	// ========================================================================
	// Initialize and append the svg canvas to faux-DOM
	// ========================================================================
	var svgNode = ReactFauxDOM.createElement('div');
	
	var svg = d3.select(svgNode).append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom)
	    .append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// ========================================================================
	// Add links
	// ========================================================================
	var link = svg.append("g").selectAll(".link")
	    .data(graph.links)
	    .enter().append("path")
	    .attr("class", "link")
	    .on('click', this.props.openModal) // register eventListener
	    .attr("d", path)
	    .style("stroke-width", (d) => Math.max(1, d.dy))

	// add link titles
	link.append("title")
	    .text((d) => d.source.name + " → " + d.target.name + "\n Weight: " + format(d.value));

	// ========================================================================
	// Add nodes
	// ========================================================================
	var node = svg.append("g").selectAll(".node")
	    .data(graph.nodes)
	    .enter().append("g")
	    .attr("class", "node")
	    .on('click', this.props.openModal) // register eventListener
	    .attr("transform", (d) => "translate(" + d.x + "," + d.y + ")")

	// add nodes rect
	node.append("rect")
	    .attr("height", (d) => d.dy)
	    .attr("width", sankey.nodeWidth())
	    .append("title")
	    .text((d) => d.name + "\n" + format(d.value));

	// add nodes text
	node.append("text")
	    .attr("x", -6)
	    .attr("y", (d) => d.dy / 2)
	    .attr("dy", ".35em")
	    .attr("text-anchor", "end")
	    .text((d) => d.name)
	    .filter((d) => d.x < width / 2)
	    .attr("x", 6 + sankey.nodeWidth())
	    .attr("text-anchor", "start");
	
	return svgNode.toReact();
	       
    }
}

export default Sankey
