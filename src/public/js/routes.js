import histogramUI from './components/histogram'
import scatterPlotUI from './components/scatterPlot'
import { displayFunctions } from './components/functionList'
import CallFlow from './components/callflow_wrapper'
import ConfigJSON from './components/ConfigJSON'
import { App, layout } from './app'

function request(title, data, cb){
    return new Promise( (resolve, reject) => {
	$.ajax({
	    type: "GET",
	    contentType: "application/json",
	    url: '/' + title,
	    data: { 'in_data': data }, 
	    success: (data) => {
		data = JSON.parse(data)
		if(self.debug){
		    console.log('[', title,'] Data:', data)
		}
		resolve(data[0])
	    },
	    error: function(err){
		if(err)
		    console.log(err);		
		reject();
	    }
	})
    })
}

function getCCT(attr, cb){
    return request('getCCT', attr, (data) =>{
    })
}

function getDotCCT(attr, cb){
    return request('getDotCCT', attr, (data) => {
    })
}

function getSankey(attr, cb){
    return request('getSankey', attr, (data) => {
    })
}

function splitCaller(idList, cb){
    idList = JSON.stringify(idList)
    return request('getCCT', idList, (data) =>{
    })
}

function getConfigFile(filename, cb){
    return request('/loadConfigFile', filename, cb)
}

function getDataMaps(attr, cb){
    return request('/getMaps', attr, cb)
}

function getDataSetInfo(cb){
    return request('/dataSetInfo', [], cb)
}

function getNodeMetrics(cb){
    return request('/getNodeMetrics', [], cb)
}

function getHistogramData(node, cb){    
    if(node.df_index != undefined){
	return request('/getHistogramData', {
	    "df_index": node.df_index[0]
	}, (data) => {
	    if(cb){
		let res = {"exc" : histScatData["exc"], "inc" : histScatData["inc"]};
		data = histogramUI(res);
		cb(res);
		return
	    }
	    console.log('[Getter] Histogram Scatter Data: ', histScatData);
	    let res= {"exc" : histScatData["exc"], "inc" : histScatData["inc"]};
	    scatterPlotUI(res);
	    histogramUI(res);
	    return histScatData
	});
    }
}

function getFunctionLists(node, cb){
    if (node.df_index != undefined){
	request('getFunctionLists',  {
	    "df_index": node.df_index[0],
	    "mod_index": node.mod_index[0]
	}, (data) => {
	    console.log('Function lists', data)
            displayFunctions(data)
            return data;
	});
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
