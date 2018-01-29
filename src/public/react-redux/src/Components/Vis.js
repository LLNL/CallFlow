import React, { Component } from 'react'
import { connect } from 'react-redux'

import store from '../store'
import GoldenLayout from './goldenLayout/index'
import { getSankey, getDatasetInfo }  from "../Actions/fetch"

class Vis extends Component {    
    componentWillMount() {
	this.props.onLoad()
    }

    render() {
	if(!this.props.loaded)
	    return null
	else {
	    return ( <GoldenLayout data={this.props.data} />)
	}
    }
}

const mapStateToProps = state => ({
  ...state.sankey
});

const mapDispatchToProps = dispatch => ({
  onLoad: payload =>
	store.dispatch(getSankey())
});


export default connect(mapStateToProps, mapDispatchToProps)(Vis)


