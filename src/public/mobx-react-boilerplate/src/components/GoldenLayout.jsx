import React, { Component } from 'react'
import { observer } from 'mobx-react'
import GoldenLayout from 'golden-layout'
import { TestComponent } from './TestComponent'

@observer
class GoldenLayoutWrapper extends Component {
    componentDidMount() {
	let windowWidth = window.innerWidth;
	let config = {
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
					type: 'component',
					componentName: 'testComponent',
					componentState: {id : "control" },
					isClosable: false,
					title: "Control"								
				    },								
				    {
					type: 'component',
					componentName: 'testComponent',
					componentState: {id : "info_view" },
					isClosable: false,
					title: "Node Info"
				    },								
				    {
					type: 'component',
					componentName: 'testComponent',
					componentState: {id : "scat_view" },
					isClosable: false,
					title: "Scatter Plot View"
				    },
				    {
					type: 'component',
					componentName: 'testComponent',
					componentState: {id : "fList_view" },
					isClosable: false,
					title: "Function List"
				    },								
				]
			    },
			    {
				type: 'component',
				componentName: 'testComponent',
				componentState: {id : "hist_view" },
				isClosable: false,
				title: "Histogram View"	
			    }
			]
		    },
		    {
			type: 'column',
			width: windowWidth * 70,
			content: [
			    {
				type: 'component',
				componentName: 'testComponent',
				componentState: { id: 'procedure_view' },
				title: 'Graph View'
			    }
			]
			
		    }
		]
	    }]			
	}

	function wrapComponent(Component, store) {
            class Wrapped extends React.Component {
                render() {
                    return (
                        <Provider store={store}>
                            <Component {...this.props}/>
                        </Provider>
                    );
                }
            }
            return Wrapped;
        };
	
	let layout = new GoldenLayout(config, this.layout);
	layout.registerComponent('testComponent',
				 wrapComponent(TestComponent, this.context.store));
	layout.init();

	window.addEventListener('resize', () => {
	    layout.updateSize();
	})
    }

    render() {
	return (
		<div className='goldenLayout' ref = { input => this.loyout = input } />
	);
    }
}

export default GoldenLayoutWrapper;
