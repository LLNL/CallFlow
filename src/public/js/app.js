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
import { getDataMaps, getNodeMetrics, getSankey, getCCT, splitCaller } from './routes'
import scatterPlotUI from './components/scatterPlot'
import CallFlow from './components/callflow_wrapper'
import CCT from './components/cct_wrapper'
import ConfigJSON from './components/ConfigJSON'
import preprocess from './components/callflow/preprocess.js'
import sankeyComputation from './components/callflow/sankeyComputation.js'

let spinner;
let layout = new Layout()


export default class App{
    constructor(){
	    this.target = document.getElementById("procedure_view").parentElement
	    this.refresh = false
	    this.spinner = spinnerWrapper(this.target)
        this.addRenderCCTBtn()
	    this.fetch('module')        
        this.callflow = null
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
	    }).then(() => {
            splitCaller('lulesh2.0').then((data) => {
                self.state = data
//                this.render()
            })
        })
    }

    addRenderCCTBtn(){
        let self = this
        let render_button= $('<input type="button" id="renderCCTBtn" value="Render CCT"/>');        
        $('#control').append(render_button)
        $('#renderCCTBtn').click(function(){
            getCCT().then((data) => {
                self.state_cct = data
                self.renderCCT()                
            })
        })
    }

    render(){
	    let prop = {
	        ID: '#procedure_view',
	        width : Math.max(1000, $('#procedure_view').height()),
	        height : $('#procedure_view').height(),
	    }
	    this.callflow = new CallFlow(this.state, prop)
	    let configJSON = new ConfigJSON();
	    this.spinner.stop();    
    }

    renderCCT(){
        let prop = {
            ID: '#CCT_view',
            width : $('#procedure_view').width(),
            height: $('#procedure_view').height()
        }

        this.CCT = new CCT(this.state_cct, prop)
    }

    update(action, attr){
	    if(action == 'onGroupChange'){
            this.clear()
	        this.fetch(attr)
	    }
        if(action == 'onColorChange'){            
            this.callflow.setColor(attr)
            this.callflow.render()
        }
	    if(action == 'onNodeScaleChange'){
	        preprocess(this.callflow.graph, true)
	        sankeyComputation(this.callflow.graph, this.callflow.view)
	        this.callflow.render()
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

