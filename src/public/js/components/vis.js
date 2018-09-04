import { getDataMaps, getNodeMetrics, getSankey } from '../routes'
import spinnerWrapper from './spinner'
import CallFlow from './callflow_wrapper'
import ConfigJSON from './ConfigJSON'

import Color from "./callflow/color"

export default class Vis {
    constructor() {
        this.target = document.getElementById("procedure_view").parentElement;        
        this.dataSetInfo = null
        this.nodeMetrics = null
        this.debug = true
        this.graphs = null
	this.color = null
    }
}

Vis.prototype.init = function() {
    let spinner = spinnerWrapper(this.target);
//    let histogram = new Histogram()

    let self = this
    getDataMaps(this.getDataMaps_callback);
    getSankey(this.getSankey_callback);

    spinner.stop();    
}

Vis.prototype.getDataMaps_callback = function(data){
    console.log(data);    
}

Vis.prototype.getSankey_callback = function(data){
    data = JSON.parse(data)
    if(self.debug){
        console.log('[Vis] Sankey information :', data)
    }
    self.graphs = data
    
    let prop = {
        ID: '#procedure_view',
        width : Math.max(1000, $('#procedure_view').height()),
        height : $('#procedure_view').height(),
    }
    let callFlow = new CallFlow(self.graphs[0], prop)
    let configJSON = new ConfigJSON();
}

Vis.prototype.update = function(){
    let spinner = spinnerWrapper(this.target)
    spinner.stop()
}
