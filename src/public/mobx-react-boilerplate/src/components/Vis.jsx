import React, { Component } from "react"
import { observable, action, computed } from "mobx"
import { observer, Provider } from "mobx-react"

import DataStore from '../models/Data'
import GoldenLayout from "./GoldenLayout"
import Data from '../models/Data'

@observer
class Vis extends Component {
    componentWillMount (){
	Data.fetch()
    }
    
    renderContent() {
	if(Data.isRequest('fetching')) {
	    console.log('fetching');
	    //return <Loading label="Application" />
	}
	else{
	    return ( <Provider DataStore = {DataStore}>
		     <GoldenLayout />
		     </Provider>
		   );
	}
    }

    render() {
	const { data } = this.props
	return (
	<div className='App'>
		<div className='App_body'>
		    {this.renderContent()}
                </div>
	</div>
	)
    }
}

export default Vis
