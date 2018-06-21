import spinnerWrapper from './spinnerWrapper'
import { getDataSetInfo, getNodeMetrics, getSankey } from '../routes'

export default class Vis {
    constructor() {
        this.target = document.getElementById("procedure_view").parentElement;        
        this.dataSetInfo = null
        this.nodeMetrics = null
        this.debug = true        
    }
}

Vis.prototype.init = function() {
    let spinner = spinnerWrapper(this.target);

    let self = this
    // fetch the data
    getDataSetInfo(function(data){
	    if(self.debug){
		    console.log("[Vis] Dataset information: ", data);
	    }
	    self.dataSetInfo = data;
	});

/*    getNodeMetrics(function(data){
        if(self.debug){
            console.log('[Vis] Node metrics : ', data);
        }
        self.nodeMetrics = data;
    });*/

    getSankey(0, function(data){
        if(self.debug){
            console.log('[Vis] Sankey information :', data)
        }
//	        singleView(data);
	    // let dualViewEnable = true;
	    // if(dualViewEnable){
	    //     dualView(data);
	    // }
	    // else{
	    //     splitView(data);
	    // }
    });

    spinner.stop();    
}
