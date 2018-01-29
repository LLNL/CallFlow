import React, { Component } from 'react'
import GoldenLayout from 'golden-layout'
import {Provider} from 'react-redux'

import TestComponent from '../TestComponent'
//import iciSank from '../iciSank/index'
import store from '../../store'

import './goldenLayout-base.css'
import './goldenLayout-light-theme.css'
import './goldenLayout.css'

class GoldenLayoutWrapper extends Component {
    componentWillMount(props) {
	let windowWidth = window.innerWidth;
	let windowHeight = window.innerHeight;

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
				component: 'testComponent',
				props: { id: 'graph_view' },
			    }
			]
			
		    }
		]
	    }]			
	}

	
        function wrapComponent(Component, store, props) {
            class Wrapper extends React.Component {
                render() {
                    return (
                        <Provider store={store}>
                            <Component {...props}/>
                        </Provider>
                    );
                }
            }
            return Wrapper;
        };

	setTimeout(() => {
	    var layout = new GoldenLayout(config, this.layout);
            layout.registerComponent('testComponent', wrapComponent(TestComponent, this.context.store));
//	    layout.registerComponent('iciSank', wrapComponent(iciSank, store, this.props.data));
	
            layout.init();
	    
            window.addEventListener('resize', () => {
		layout.updateSize();
            });
	}, 0);
    }
    
    render() {
            return (
		    <div className='goldenLayout' ref={input => this.layout = input}/>
            )
	
    }
}


export default GoldenLayoutWrapper
