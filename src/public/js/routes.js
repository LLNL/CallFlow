import histogramUI from './components/histogram'
import scatterPlotUI from './components/scatterPlot'
import { displayFunctions } from './components/functionList'
import CallFlow from './components/callflow_wrapper'
import ConfigJSON from './components/ConfigJSON'
import { App, layout } from './app'

function request(title, data, cb){
  console.log("Request - ", title)
  return new Promise( (resolve, reject) => {
	  $.ajax({
	    type: "GET",
	    contentType: "application/json",
	    url: '/' + title,
	    data: { 'in_data': JSON.stringify(data) }, 
	    success: (data) => {
		    data = JSON.parse(data)
        console.log(data)
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
  return request('splitCaller', idList, (data) => {
  })
}

function getConfigFile(filename, cb){
  return request('loadConfigFile', filename, cb)
}

function getDataMaps(attr, cb){
  return request('getMaps', attr, cb)
}

function getDataSetInfo(cb){
  return request('dataSetInfo', [], cb)
}

function getNodeMetrics(cb){
  return request('getNodeMetrics', [], cb)
}

function getGraphEmbedding(cb){
  return request('getGraphEmbedding', [], cb)
}

function getHierarchy(node, level, cb){
  return new Promise( (resolve, reject) => {
    let n_index;
    if(node.n_index instanceof Array){
      n_index = node.n_index[0]
    }
    else{
      n_index = node.n_index
    }    
    if(n_index != undefined){
      $.ajax({
        type: 'GET',
        contentType: 'application/json',
        dataType: 'json',
        url: '/getHierarchy',
        data: {
          "in_data": JSON.stringify({
            "n_index": n_index,                        
          })
        },
        success: function(data){
          data = JSON.parse(JSON.stringify(data))
          console.log("Hierarchy data", data)          

          resolve(data)
        },
        error: function(err){
          if(err){
            console.log(err)
            console.log("There was problem with getting the data for next level nodes");
          }
          reject(err)
        }
      })
    }
  })
}

function getHistogramData(node, cb){    
  console.log("Request - getHistogramData")
  if(node.n_index != undefined){
    console.log(node)
    $.ajax({
      type:'GET',
      contentType: 'application/json',
      dataType: 'json',
      url: '/getHistogramData',
      data: {
        "in_data": JSON.stringify({
          "n_index": node.n_index[0],
          "mod_index": node.mod_index[0]
        })
      },
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
  }}

function getFunctionLists(node, cb){
  let n_index, mod_index;
  if(node.n_index instanceof Array){
    n_index = node.n_index[0]
    mod_index = node.mod_index[0]
  }
  else{
    n_index = node.n_index
    mod_index = node.mod_index
  }
  if(n_index != undefined){
    $.ajax({
      type:'GET',
      contentType: 'application/json',
      dataType: 'json',
      url: '/getFunctionLists',
      data: {
        "in_data": JSON.stringify({
          "n_index": n_index,
          "mod_index": mod_index
        })
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
  getHierarchy,
  splitCaller,
  getGraphEmbedding,
}
