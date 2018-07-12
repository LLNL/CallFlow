import spinnerWrapper from './spinnerWrapper'
import { getDataSetInfo, getNodeMetrics, getSankey } from '../routes'
import CallFlow from './callFlow'

export default class Vis {
    constructor() {
        this.target = document.getElementById("procedure_view").parentElement;        
        this.dataSetInfo = null
        this.nodeMetrics = null
        this.debug = true
        this.graphs = null
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
        self.graphs = data.graphs
        let prop = {
            ID: '#procedure_view',
            width : $('#procedure_view').width(),
            height : $('#procedure_view').height(),
            margin : { top: 0, right: 10, bottom: 10, left: 10 },
        }
        let callFlow = new CallFlow(self.graphs[0], prop)
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

Vis.prototype.update = function(){
    let spinner = spinnerWrapper(this.target)

    spinner.stop()
}