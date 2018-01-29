import React, { Component } from 'react'
import * as d3 from 'd3'
import PropTypes from 'prop-types'

import Nodes from './nodes'

class Node extends Component {
    constructor(props){
	super(props)
	let state = {
	    color: '#dadada'
	}
    }
    componentWillMount () {
	this.nodeSize = this.props.nodeSize
    }

    getNodeStyle(node) {
	let style = {
	    stroke : "#000",
	    display: "block",
	    strokeWidth: 0.5,
	    cursor: "pointer",
	    opacity: 1,
	    fill : "ff1"
	}
	return style
    }
    
    renderNode(node){
	let boxOffsets = this.props.boxOffsets
	let nodeSize = this.props.nodeSize
	let nodeStyle = this.getNodeStyle(node)
	return ( <rect
		 x={(node.props.columnInBox + boxOffsets[node.box])*nodeSize}
		 y={node.row*10}
		 className = "node"
		 style = {nodeStyle}
		 width = {10}
		 height = {10}
		 ></rect>
	       )
    }
    
    render(){
	let nodes = this.props.graph[0]
	let self = this
	return (
		<g id="iciSank_nodes">
		{nodes.map(function(node, index){
		    self.renderNode(node)
		})}
	    </g>
	)
    }
}

export default Node
