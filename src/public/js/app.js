 /*******************************************************************************
 * Copyright (c) 2017, Lawrence Livermore National Security, LLC.
 * Produced at the Lawrence Livermore National Laboratory.
 *
 * Written by Huu Tan Nguyen <htpnguyen@ucdavis.edu>.
 *
 * LLNL-CODE-740862. All rights reserved.
 *
 * This file is part of CallFlow. For details, see:
 * https://github.com/LLNL/CallFlow
 * Please also read the LICENSE file for the MIT License notice.
 ******************************************************************************/

import Layout from './components/goldenLayout'
import ControlUI from './components/control_wrapper'
import spinnerWrapper from './components/spinner'
import { getDataMaps, getNodeMetrics, getSankey } from './routes'
import scatterPlotUI from './components/scatterPlot'
import CallFlow from './components/callflow_wrapper'
import ConfigJSON from './components/ConfigJSON'

let spinner;
let layout = new Layout()


export default class App{
    constructor(){
	this.target = document.getElementById("procedure_view").parentElement;
	this.refresh = false
	this.spinner = spinnerWrapper(this.target);
	this.fetch('module')
    }
    

    setState(data){
	this.state = data
    }

    setDataMap(data){
	this.dataMap = data
    }

    fetch(attr){
	let self = this
	getSankey(attr).then((data) => {
	    self.state = data
	    getDataMaps().then((map) => {
		self.map = map
		this.render()
	    })
	})
    }

    render(){
	let prop = {
	    ID: '#procedure_view',
	    width : Math.max(1000, $('#procedure_view').height()),
	    height : $('#procedure_view').height(),
	}
	this.callFlow = new CallFlow(this.state, prop)
	let configJSON = new ConfigJSON();
	this.spinner.stop();    
    }

    update(action, attr){
	this.clear()
	if(action == 'groupBy'){
	    this.fetch(attr)
	}
    }

    clear(){
	$('#procedure_view').empty()
	$('#control').empty()
	$('#config_file_editor').empty()
	$('#hist_view').empty()
    }
}

// function start(){
//     let target = document.getElementById("procedure_view").parentElement;        
//     spinner = spinnerWrapper(target);
//     getSankey('module', getSankey_cb);
//     getDataMaps();
// }

// function getSankey_cb(data){
//     data = JSON.parse(data)
//     if(self.debug){
// 	console.log('[Vis] Sankey information :', data)
//     }
//     render(data[0])
// }

// function render(data){
//     let prop = {
// 	ID: '#procedure_view',
// 	width : Math.max(1000, $('#procedure_view').height()),
// 	height : $('#procedure_view').height(),
//     }
//     let callFlow = new CallFlow(data, prop)
//     let configJSON = new ConfigJSON();
//     spinner.stop();    
// }

export {
    App,
    layout
}

