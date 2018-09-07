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

function getSankey(cb){
    $.ajax({
	type: "GET",
	contentType: "application/json",
	url: '/getSankey',
	success: cb,
	error: function(err){
	    console.log(err);
	}
    })
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

function getHistogramData(node){
    $.ajax({
	type:'GET',
	contentType: 'application/json',
	dataType: 'json',
	url: '/getHistogramData',
	data: {"df_index": node.df_index[0]},
	success: function(histScatData){
	    console.log(histScatData)
	    if(debug){
		console.log('[Getter] Histogram Scatter Data: ', histScatData);
	    }
	    sankNodeDataHistScat = {"exc" : histScatData["exc"], "inc" : histScatData["inc"]};
	    showScatterPlot();
	    histogramUI();
	},
	error: function(){
	    console.log("There was problem with getting the data for histogram and scatter plot");
	}	
    });	
}

export {
    getDataMaps,
    getNodeMetrics,
    getSankey,
    getConfigFile,    
    getHistogramData
}
