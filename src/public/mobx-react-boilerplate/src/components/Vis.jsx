import React, { Component } from "react"
import { observable, action, computed } from "mobx"
import { observer, inject, Provider } from "mobx-react"

import GoldenLayout from "./GoldenLayout"
import Sankey from './Sankey'

import sankeyStore from '../store/sankeyStore'

@inject('sankeyStore')
@observer
class Vis extends Component {
    componentWillMount (){
	this.props.sankeyStore.getData()
    }

    renderVis() {
	if(!this.props.sankeyStore.isLoading){
	    return ( <Sankey store={sankeyStore} />)
	}
	else
	    console.log("fetching")
    }

    render() {
	return (
		<Provider store={sankeyStore}>
		<div className='App'>
		<div id="Vis">
		{this.renderVis()}
	    </div>
		</div>
		</Provider>
	)
    }
}

export default Vis
