import React, { Component } from 'react'
import ReactDom from 'react-dom'
import { observer, Provider } from 'mobx-react'
import GoldenLayout from 'golden-layout'
import { TestComponent } from './TestComponent'
import { Sankey } from './Sankey'

import Vis from './Vis'

@observer
class GoldenLayoutWrapper extends Component {
    componentDidMount() {
	let windowWidth = window.innerWidth;
	const config = {
	    settings: {
		showCloseIcon : false,
		showPopoutIcon : false,
		reorderEnabled : false
	    },

	    content: [{
		type: 'row',
		content: [
		    {
			type: 'column',
			width: windowWidth * 25,
			content: [
			    {
				type: 'stack',
				content: [
				    {
					title: "Control",								
					type: 'react-component',
					component: 'testComponent',
					props: { id : "control" },
				    },								
				    {
					title: "Node Info",
					type: 'react-component',
					component: 'testComponent',
					props: { id : "info_view" }
				    },								
				    {
					title: "Scatter Plot View",
					type: 'react-component',
					component: 'testComponent',
					props: { id : "scat_view" },
				    },
				    {
					title: "Function List",
					type: 'react-component',
					component: 'testComponent',
					props: { id : "fList_view" },
				    },								
				]
			    },
			    {
				title: "Histogram View",
				type: 'react-component',
				component: 'testComponent',
				props: { id : "hist_view" },
			    }
			]
		    },
		    {
			type: 'column',
			width: windowWidth * 70,
			content: [
			    {
				title: 'Graph View',
				type: 'react-component',
				component: 'Vis',
				props: { id: 'graph_view' },
			    }
			]
			
		    }
		]
	    }]			
	}
	
        function wrapComponent(component, store) {
            class Wrapped extends Component {
                render() {
                    return (
                        <Provider store={store}>
                            <component {...this.props}/>
                        </Provider>
                    );
                }
            }
            return Wrapped;
        };
	
	let layout = new GoldenLayout(config, this.layout)
	layout.registerComponent('testComponent', TestComponent)
	layout.registerComponent('Vis', Vis)
	layout.init()
	window.addEventListener('resize', () => {
	    layout.updateSize();
	})
    }

    render() {
	return (
		<div className='goldenLayout' ref = {input => this.layout = input} />
	);
    }
}

export default GoldenLayoutWrapper;
