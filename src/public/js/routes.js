import histogramUI from './components/histogram'
import scatterPlotUI from './components/scatterPlot'
import CallFlow from './components/callflow_wrapper'
import ConfigJSON from './components/ConfigJSON'


function getSankey(attr){
    console.log('Grouping by', attr)
    $.ajax({
	type: "GET",
	contentType: "application/json",
	url: '/getSankey',
	data: { 'group_by': attr }, 
	success: function(data){
	    $('#procedure_view').empty()
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

	},
	error: function(err){
	    console.log(err);
	}
    })
}

function getConfigFile(filename, cb){
    $.ajax({
	type:'GET',
	contentType: 'applications/json',
	dataType: 'json',
	url: '/loadConfigFile',
	data: { "filename": filename },
	success: cb,
	error: () => {
	    console.log('There was a problem with reading the config file');	    
	}
    })
}

function getDataMaps(){
    $.ajax({
	type:'GET',
	contentType: 'applications/json',
	dataType: 'json',
	url: '/getMaps',
	success: (map) =>{
	    console.log("Map", map);
	    return map
	},
	error: () => {
	    console.log('There was a problem with reading the config file');	    
	}
    })
}


function getDataSetInfo(cb){
    $.ajax({
	    type:'GET',
	    contentType: 'application/json',
	    url: '/dataSetInfo',
	    success: cb,
	    error: function(){
	        console.log("There was problem with getting the metric data");
	    }	
    });				
}

function getNodeMetrics(cb){
    $.ajax({
        type:'GET',
        contentType: 'application/json',
        dataType: 'json',
        url: '/getNodeMetrics',
        success: cb,
        error: function(){
            console.log("There was problem with getting the metric data");
        }	
    });				
}

function getList(node){
    $.ajax({
	    type:'GET',
	    contentType: 'application/json',
	    dataType: 'json',
	    url: '/getLists',
	    data: {"specialID" : node["specialID"]},
	    success: function(procedureListData){
	        if(debug){
		        console.log('[Getter] List: ', procedureListData);
	        }
	        listData = [];
	        var procIDs = Object.keys(procedureListData);
	        procIDs.forEach(function(procedureID){
		        if(procedureListData[procedureID]['value'] >= rootRunTime * (1/100)){
		            listData.push(procedureListData[procedureID]);
		        }
	        })
	        displayList(listData);
	    },
	    error: function(){
	        console.log("There was problem with getting the data");
	    }	
    });				
}

function getScatter(node){
    $.ajax({
	    type:'GET',
	    contentType: 'application/json',
	    dataType: 'json',
	    url: '/getRuntimeOfNode',
	    data: {"nodeID" : node.myID, "specialID" : node.specialID , "nodeLevel" : node.oldLevel, "lmID" : selectedLMID, "offset": (node.oldLevel - node.level), "name" : node.name},
	    success: function(runTimes){
	        if(debug){
		        console.log('[Getter] Scatter plot data: ', runTimes);
	        }
	        scatterData = runTimes;
	        showScatterPlot();
	        histogramUI();
	    },
	    error: function(){
	        console.log("There was problem with getting the data");
	    }	
    });				
}

function getHistogramData(node, cb){    
    if(node.df_index != undefined){
	console.log('fetch')
	$.ajax({
	    type:'GET',
	    contentType: 'application/json',
	    dataType: 'json',
	    url: '/getHistogramData',
	    data: {"df_index": node.df_index[0]},
	    success: function(histScatData){
		if(cb){
		    let data = {"exc" : histScatData["exc"], "inc" : histScatData["inc"]};
		    data = histogramUI(data);
		    console.log(data)
		    cb(data);
		    return
		}
		console.log('[Getter] Histogram Scatter Data: ', histScatData);
		let data = {"exc" : histScatData["exc"], "inc" : histScatData["inc"]};
		scatterPlotUI(data);
		histogramUI(data);
		return histScatData
	    },
	    error: function(){
		console.log("There was problem with getting the data for histogram and scatter plot");
	    }	
	});	
    }
}

function getFunctionLists(node, cb){
    if (node.df_index != undefined){
	$.ajax({
	    type:'GET',
	    contentType: 'application/json',
	    dataType: 'json',
	    url: '/getFunctionLists',
	    data: {"df_index": node.df_index[0]},
	    success: function(histScatData){
	    },
	    error: function(){
		console.log("There was problem with getting the data for histogram and scatter plot");
	    }
	})
    }
} 

export {
    getDataMaps,
    getNodeMetrics,
    getSankey,
    getConfigFile,    
    getHistogramData,
    getFunctionLists
    
}
