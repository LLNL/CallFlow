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
    getSankey('module');
    getDataMaps(this.getDataMaps_callback);

    spinner.stop();    
}

Vis.prototype.getDataMaps_callback = function(data){
    console.log(data);    
}


Vis.prototype.update = function(){
    let spinner = spinnerWrapper(this.target)
    spinner.stop()
}
