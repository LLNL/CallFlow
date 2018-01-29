import React, { Component } from 'react'
import { connect } from 'react-redux'
import * as d3 from 'd3'


class iciSank extends Component {    
    constructor(props){
	super(props)
	this.state = {
	    plotWidth : window.innerWidth,
	    plotHeight: window.innerHeight
	}
    }
    
    compoenentWillMount(){

    }
    
    render() {
	return (
		<svg id="iciSank" width={this.state.plotWidth} height={this.state.plotHeight}>
		</svg>
	       )
    }
}

export default iciSank
