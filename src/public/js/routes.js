import histogramUI from './components/histogram'
import scatterPlotUI from './components/scatterPlot'
import { displayFunctions } from './components/functionList'
import CallFlow from './components/callflow_wrapper'
import ConfigJSON from './components/ConfigJSON'
import { App, layout } from './app'

function getSankey(attr, cb){
    return new Promise( (resolve, reject) => {
	    $.ajax({
	        type: "GET",
	        contentType: "application/json",
	        url: '/getSankey',
	        data: { 'group_by': attr }, 
	        success: (data) => {
		        data = JSON.parse(data)
		        if(self.debug){
		            console.log('[Vis] Sankey information :', data)
		        }
		        resolve(data[0])
	        },
	        error: function(err){
		        console.log(err);
		        reject();
	        }
	    })
    })
}

function getCCT(attr, cb){
    return new Promise( (resolve, reject) => {
	    $.ajax({
	        type: "GET",
	        contentType: "application/json",
	        url: '/getCCT',
	        success: (data) => {
		        data = JSON.parse(data)
		        if(self.debug){
		            console.log('[Vis] Sankey information :', data)
		        }
		        resolve(data[0])
	        },
	        error: function(err){
		        console.log(err);
		        reject();
	        }
	    })
    })
}


function splitCaller(attr, cb){
    return new Promise( (resolve, reject) => {
	    $.ajax({
	        type: "GET",
	        contentType: "application/json",
	        url: '/splitCaller',
            data: { 'node': attr },
	        success: (data) => {
//		        data = JSON.parse(data)
		        if(self.debug){
		            console.log('[Vis] Sankey information :', data)
		        }
		        resolve(data[0])
	        },
	        error: function(err){
		        console.log(err);
		        reject();
	        }
	    })
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
    return new Promise( (resolve, reject) => {
	    $.ajax({
	        type:'GET',
	        contentType: 'applications/json',
	        dataType: 'json',
	        url: '/getMaps',
	        success: (map) =>{
		        resolve(map)
	        },
	        error: () => {
		        console.log('There was a problem with reading the config file');
		        reject()
	        }
	    })
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
        console.log(node.df_index[0])
	    $.ajax({
	        type:'GET',
	        contentType: 'application/json',
	        dataType: 'json',
	        url: '/getFunctionLists',
	        data: {
                "df_index": node.df_index[0],
                "mod_index": node.mod_index[0]
            },
	        success: function(data){
                console.log('Function lists', data)
                displayFunctions(data)
                return data;
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
    getFunctionLists,
    getCCT,
    splitCaller,
}
