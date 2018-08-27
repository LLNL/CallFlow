import spinnerWrapper from './spinnerWrapper'
import { getDataSetInfo, getNodeMetrics, getSankey } from '../routes'
import CallFlow from './CallFlow.js'
import Color from "./callflow/color.js"
import ConfigJSON from './ConfigJSON.js'

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

    let self = this
    // fetch the data
    // getDataSetInfo(function(data){
    // 	if(self.debug){
    // 	    console.log("[Vis] Dataset information: ", data);
    // 	}
    // 	self.dataSetInfo = data;
    // });

    /*    getNodeMetrics(function(data){
          if(self.debug){
          console.log('[Vis] Node metrics : ', data);
          }
          self.nodeMetrics = data;
	  });*/

    getSankey(function(data){
	data = JSON.parse(data)
        if(self.debug){
            console.log('[Vis] Sankey information :', data)
        }
        self.graphs = data

        let prop = {
            ID: '#procedure_view',
            width : $('#procedure_view').width(),
            height : $('#procedure_view').height(),
        }
        let callFlow = new CallFlow(self.graphs[0], prop)
	let configJSON = new ConfigJSON();
    });

    spinner.stop();    
}

Vis.prototype.update = function(){
    let spinner = spinnerWrapper(this.target)
    spinner.stop()
}
