/*******************************************************************************
 * Copyright (c) 2017, Lawrence Livermore National Security, LLC.
 * Produced at the Lawrence Livermore National Laboratory.
 *
 * Written by Huu Tan Nguyen <htpnguyen@ucdavis.edu>.
 *
 * LLNL-CODE-740862. All rights reserved.
 *
 * This file is part of CallFlow. For details, see:
 * https://github.com/LLNL/CallFlow
 * Please also read the LICENSE file for the MIT License notice.
 ******************************************************************************/

import Layout from './goldenLayout'
import View from './view'
import ControlUI from './components/controlUI'
import Vis from './components/vis'
import SpinnerWrapper from './components/spinnerWrapper'

let layout = new Layout()

function start(){
    let controlUI =  new ControlUI();
    //    let functionListUI = new FunctionListUI();
    let vis = new Vis()
    vis.init()
}

export {
    start
}

var debug = true;
var rectWidth = 20;
var rectHeight = 20;
var visData;
var minVal;
var maxVal;
var numbOfClusters = 16; //this is the number of clusters
var lmView;
var sankeyVis;
var selectedLMID;
var scatterPot;
var histogram;
var listData;
var sankColor;
var edges;
var nodes;
var edgeList;
var nodeList;
var connectionList;
var currentClickNode;
var nodeMetrics;
//this is the data use for the histogram and scatter plot
var sankNodeDataHistScat = {};
var sankeyScale;
var specialIDToSankIDMap = {};
var currentMaxID = 0;
var globalNodes;
var globalEdges;
var rootRunTime = 0;
var showLabelBool = false;
var dataSetInfo;
var maxNodeSize = 0.75*window.innerHeight;

function startVis(){
    getNodeMetrics();
    getDataSetInfo();
    getSankey(0);
}

function lmCallBack(lmID){
    selectedLMID = lmID;
}

function getDataStat(){
    var min = Number.MAX_SAFE_INTEGER;
    var max = 0;
    Object.keys(visData).forEach(function(rowid){
	    visData[rowid].forEach(function(dat){
	        min = Math.min(min, dat.value);
	        max = Math.max(max, dat.value);
	    })
    });
    minVal = min;
    maxVal = max;
}


function nodesObjToArr(nodes){
    let nodesArr = [];
    var labelList = Object.keys(nodes);
    labelList.forEach(function(lab){
	    var tempObj = nodes[lab];
	    nodesArr.push(tempObj);
        //	idMap[ myNodes.sankeyID ] = 0;
        //	specialIDToSankIDMap[lab] = tempObj["sankeyID"];
        //        currentMaxID = Math.max(currentMaxID, tempObj["sankeyID"]);
    });

    nodesArr.sort(function(a,b){
	    return a['sankeyID'] - b['sankeyID'];
    })    
    return nodesArr;    
}

function singleView(data){
    let graphs = data['graphs'];
    for(let i = 0; i < graphs.length; i++){
        console.log(graphs[i]);
        let sankey = new singleSankey({
	        ID: '#procedure_view',
	        width: $('#procedure_view').width(),
	        height: $('#procedure_view').height(),
	        margin: { top: 0, right: 10, bottom: 10, left:10 },
	        data: graphs[i],
	        clickCallBack: nodeClickCallBack,
	        maxNodeSize: maxNodeSize
        });
    }
}

function dualView(data){
    let graphs = data["graphs"][0];
    let histogramData = data["histogramData"];
    let nodes0Arr = nodesObjToArr(graphs[0].nodes);
    let nodes1Arr = nodesObjToArr(graphs[1].nodes);

    let graph0edge = graphs[0].edges;
    let graph1edge = graphs[1].edges;

    graph0edge.sort(function(a,b){
	    return a['sourceID'] - b['targetID'];
    })

    graph1edge.sort(function(a,b){
	    return a['sourceID'] - b['targetID'];
    })

    $('#procedure_view').empty();
    let sankeyVis1 = new Sankey({
	    ID: '#procedure_view',
	    width: $('#procedure_view').width(),
	    height: $('#procedure_view').height()/2,
	    margin: { top: 10, right: 10, bottom: 10, left:10 },
	    data: { 'nodes': nodes0Arr, 'links': graph0edge },
	    histogramData : histogramData,
	    clickCallBack: nodeClickCallBack,
	    maxNodeSize: maxNodeSize
    })

    let sankeyVis2 = new Sankey({
	    ID: '#procedure_view',
	    width: $('#procedure_view').width(),
	    height: $('#procedure_view').height()/2,
	    margin: { top: $('#procedure_view').height/2, right: 10, bottom: 10, left:10 },
	    data: { 'nodes': nodes1Arr, 'links': graph1edge },
	    histogramData : histogramData,
	    clickCallBack: nodeClickCallBack,
	    maxNodeSize: maxNodeSize
    })
}


/*
  function getSankey(lmID){
  $.ajax({
  type:'GET',
  contentType: 'application/json',
  dataType: 'json',
  url: '/getSankey',
  data: {"lmID" : lmID},
  success: function(newData){
  if(debug){
  console.log('[Getter] Sankey: ', newData);
  }
  var data = newData["graph"];
  var histogramData = newData["histogramData"];
  var offSet = 0;
  nodes = data["nodes"];
  edges = data["edges"];
  var myNodes = [];

  var idMap = {};

  var labelList = Object.keys(nodes);
  labelList.forEach(function(lab){
  var tempObj = nodes[lab];
  myNodes.push(tempObj);
  idMap[ myNodes.sankeyID ] = 0;
  specialIDToSankIDMap[lab] = tempObj["sankeyID"];
  currentMaxID = Math.max(currentMaxID, tempObj["sankeyID"]);
  });

  globalNodes = myNodes;
  globalEdges = edges;
  
  console.log(myNodes);
  myNodes.sort(function(a,b){
  return a['sankeyID'] - b["sankeyID"];
  })
  edges.sort(function(a,b){
  return a["sourceID"] - b["targetID"];
  })

  edges.forEach(function(edge){
  if(edge["sourceLabel"] == "LM0" || parseInt(edge["sourceLabel"]) == 0){
  rootRunTime += edge["value"];
  }
  })

  edgeList = data["edgeList"];
  nodeList = data["nodeList"];
  connectionList = data["connInfo"];

  $('#procedure_view').empty();
  sankeyVis = new Sankey({
  ID: "#procedure_view",
  width: $("#procedure_view").width(),
  height: $("#procedure_view").height(),
  // width: width,
  // height: height,
  margin: {top: 10, right: 10, bottom: 10, left: 10},
  data: {"nodes": myNodes, "links": edges},
  toolTipData : {"edgeList" : edgeList, "nodeList": nodeList, "connInfo" : connectionList},
  histogramData : histogramData,
  // spinner: spinner,
  clickCallBack: nodeClickCallBack,
  maxNodeSize: maxNodeSize
  })	

  // sankColor = sankeyVis.colorScale;				

  if(showLabelBool == true){
  d3.selectAll('.node text').style('opacity', 1);
  }
  else{
  d3.selectAll('.node text').style('opacity', 0);
  }
  },
  error: function(){
  console.log("There was problem with getting the data");
  }	
  });				
  }*/
// getData();



function splitNode(){
    var idList = $('input:checkbox:checked.list_checkbox').map(function () {
	    return parseInt(this.value);
    }).get();
    spinner.spin(target);
    $.ajax({
	    type:'GET',
	    contentType: 'application/json',
	    dataType: 'json',
	    url: '/splitNode',
	    data: {"idList" :  idList},
	    success: function(newData){
	        
	        var data = newData;
	        var offSet = 0;
	        var nodes = data["nodes"];
	        var edges = data["edges"];
	        var myNodes = [];
	        var levelOffSet = 0;
	        var maxLevel = {};
	        var tempNodes = {};

	        var treeLevel = Object.keys(nodes);
	        treeLevel.forEach(function(myLevel){
		        var myLM = Object.keys(nodes[myLevel]);

		        if(myLM.length == 0){
		            levelOffSet += 1;
		        }

		        myLM.forEach(function(loadMod){
		            var tempObj = nodes[myLevel][loadMod];
		            tempObj.oldLevel = tempObj.level;
		            tempObj.level = tempObj.level - levelOffSet;
		            if(maxLevel[loadMod] == null){
			            maxLevel[loadMod] = 0;
		            }
		            maxLevel[loadMod] = Math.max(maxLevel[loadMod], tempObj.level);
		            tempNodes[loadMod] = tempObj;
		            myNodes.push(tempObj);
		        })
	        });

	        var lmNodes = Object.keys(tempNodes);
	        //refinement
	        for(var i = 0; i < 20; i++){
		        lmNodes.forEach(function(lmN){
		            var parents = tempNodes[lmN]["parentLMProcID"];
		            if(parents){
			            var lvl = 0;
			            parents.forEach(function(par){
			                if(maxLevel[par] != null){
				                lvl = Math.max( lvl, maxLevel[par] );
			                }
			            });

			            var newLevel = lvl + 1;
			            tempNodes[lmN].level = newLevel;
			            if(maxLevel[lmN]){
			                maxLevel[lmN] = newLevel;
			            }
		            }

		        })
	        }					

	        myNodes = [];
	        lmNodes.forEach(function(lmN){
		        // var parents = tempNodes[lmN]["parentLMProcID"];
		        myNodes.push(tempNodes[lmN]);
	        })						

	        $('#procedure_view').empty();
	        sankeyVis = new Sankey({
		        ID: "#procedure_view",
		        width: $("#procedure_view").width(),
		        height: $("#procedure_view").height(),
		        // width: width,
		        // height: height,
		        margin: {top: 10, right: 10, bottom: 10, left: 10},
		        data: {"nodes": myNodes, "links": edges},
		        colorScale : sankColor,
		        clickCallBack: nodeClickCallBack,
		        maxNodeSize : maxNodeSize
	        })					

	        if(showLabelBool == true){
		        d3.selectAll('.node text').style('opacity', 1);
	        }
	        else{
		        d3.selectAll('.node text').style('opacity', 0);
	        }
	        spinner.stop();
	    },
	    error: function(){
	        console.log("There was problem with getting the data");
	    }	
    });
}

function splitNode2(){
    var idList = $('input:checkbox:checked.list_checkbox').map(function () {
	    return parseInt(this.value);
    }).get();

    spinner.spin(target);
    $.ajax({
	    type:'GET',
	    contentType: 'application/json',
	    dataType: 'json',
	    url: '/splitNode',
	    data: {"idList" :  idList, "lmID" : currentClickNode["nodeSpecialID"]},
	    success: function(newData){
	        var data = newData["graph"];
	        var offSet = 0;
	        nodes = data["nodes"];
	        edges = data["edges"];
	        var myNodes = [];

	        var labelList = Object.keys(nodes);
	        labelList.forEach(function(lab){
		        var tempObj = nodes[lab];
		        myNodes.push(tempObj);
	        });

	        edgeList = data["edgeList"];
	        nodeList = data["nodeList"];
	        connectionList = data["connInfo"];
	        
	        var remapResult = remapID(myNodes, edges, labelList);
	        var newToolTipData = {"edgeList" : edgeList, "nodeList": nodeList, "connInfo" : connectionList}
	        var histogramData = newData["histogramData"];
	        sankeyVis.updateData({"nodes" : remapResult["nodes"], "links" : remapResult["links"], "toolTipData" : newToolTipData, "histogramData" : histogramData, "maxNodeSize": maxNodeSize });
	        if(showLabelBool == true){
		        d3.selectAll('.node text').style('opacity', 1);
	        }
	        else{
		        d3.selectAll('.node text').style('opacity', 0);
	        }
	        spinner.stop();
	    },
	    error: function(){
	        console.log("There was problem with getting the data");
	    }	
    });			
}

function splitNodeByParents(){
    var nodeLabel = currentClickNode["nodeLabel"];
    var nodeSpecialID = currentClickNode["nodeSpecialID"];
    var parentProcList = {};
    spinner.spin(target);
    $.ajax({
	    type:'GET',
	    contentType: 'application/json',
	    dataType: 'json',
	    url: '/splitNodeByParents',
	    data: {"parentProcList" :  parentProcList, "nodeLabel" : nodeLabel, "nodeSpecialID" : nodeSpecialID},
	    success: function(newData){

	        var data = newData["graph"];
	        var offSet = 0;
	        nodes = data["nodes"];
	        edges = data["edges"];
	        var myNodes = [];

	        var labelList = Object.keys(nodes);
	        labelList.forEach(function(lab){
		        var tempObj = nodes[lab];
		        myNodes.push(tempObj);
	        });	            	

	        edgeList = data["edgeList"];
	        nodeList = data["nodeList"];
	        
	        var remapResult = remapID(myNodes, edges, labelList);
	        var newToolTipData = {"edgeList" : edgeList, "nodeList": nodeList}
	        var histogramData = newData["histogramData"];
	        sankeyVis.updateData({"nodes" : remapResult["nodes"], "links" : remapResult["links"], "toolTipData" : newToolTipData, "histogramData" : histogramData, "maxNodeSize": maxNodeSize });
	        if(showLabelBool == true){
		        d3.selectAll('.node text').style('opacity', 1);
	        }
	        else{
		        d3.selectAll('.node text').style('opacity', 0);
	        }
	        spinner.stop();
	    },
	    error: function(){
	        console.log("There was problem with getting the data");
	    }	
    });				
}

//this function split the entry points of the parent nodes
function splitParentNode(node){
    var currentNodeSankeyID = node.myID;
    var parentsSpecialID = [];

    //get parent special id based on the edges
    edges.forEach(function(edge){
	    //this edge's target is me
	    //that mean the source is my parent
	    if(edge["targetID"] == currentNodeSankeyID){
	        var parentSpcID = edge["sourceSpcID"];
	        if(parentsSpecialID.indexOf(parentSpcID) == -1){
		        parentsSpecialID.push(parentSpcID);
	        }
	    }
    });

    //loop through the parent spc id
    //for each, get the function id
    parentsSpecialID.forEach(function(parentSpecID){

    })

    $.ajax({
	    type:'GET',
	    contentType: 'application/json',
	    dataType: 'json',
	    url: '/getLists',
	    data: {"specialIDs" : parentsSpecialID},
	    success: function(newData){
	        if(debug){
		        console.log('[Split parents] Lists: ', newData);
	        }
	        console.log("done with getting lists of functions for parents");
	    },
	    error: function(){
	        console.log("There was problem with getting the data");
	    }	
    });					

    //sort them by inclusive time
    //lable each function clearly with time and lm
    //let the user select which function to split
    //this is to keep consistent with the other split method

}

function getEntryPoints(specID){

}

function brushCallBack(processIDList){
    $.ajax({
	    type:'GET',
	    contentType: 'application/json',
	    dataType: 'json',
	    url: '/calcEdgeValues',
	    data: {"processIDList" : processIDList},
	    success: function(edgeSets){
	        // edges = edgeSets["brush"];
	        var myNodes = [];
	        var labelList = Object.keys(nodes);
	        labelList.forEach(function(lab){
		        var tempObj = nodes[lab];
		        myNodes.push(tempObj);
	        })

	        var remapedEdgesBrushed = reMapEdges(edgeSets["brush"]);
	        var remapedEdgesNonBrushed = reMapEdges(edgeSets["nonBrush"]);

	        sankeyVis.changeProcessSelect({"brush": edgeSets["brush"], "nonBrush" : edgeSets["nonBrush"]});	
	        sankeyVis.changeProcessSelect({"brush": remapedEdgesBrushed, "nonBrush" : remapedEdgesNonBrushed});		

	        if(showLabelBool == true){
		        d3.selectAll('.node text').style('opacity', 1);
	        }
	        else{
		        d3.selectAll('.node text').style('opacity', 0);
	        }
	    },
	    error: function(){
	        console.log("There was problem with getting the metric data");
	    }	
    });					

}

function remapID(newNodes, newEdges, newNodeListLabel){
    //first find the difference between the old nodes and the new nodes
    //basically, nodes that are in the old list but not in the new list
    var oldNodeListLabel = Object.keys(specialIDToSankIDMap);
    var removeNodesLabel = [];
    oldNodeListLabel.forEach(function(oNodeLab){
	    if(newNodeListLabel.indexOf(oNodeLab) == -1){
	        //so we remove the node with this label
	        removeNodesLabel.push(oNodeLab);
	    }
    });

    //now mapping the newNodeID to the old one
    //reused the remove ones or create new one as needed
    var newSpecialIDToSankIDMap = {};
    var tempMaxID = 0;

    newNodes.forEach(function(nNode){
	    var curretnNodeLabel = nNode["specialID"];
	    if(specialIDToSankIDMap[curretnNodeLabel] != null){
	        // if(curretnNodeLabel == "LM8_0"){
	        // 	nNode["specialID"] = "LM8_10";
	        // 	nNode["name"] = "LEOS";
	        // }

	        nNode["sankeyID"] = specialIDToSankIDMap[curretnNodeLabel];
	    }
	    else{
	        //this is a new label
	        //first check if we can reuse an old one
	        if(removeNodesLabel.length > 0){
		        var reuseLabel = removeNodesLabel[0];
		        nNode["sankeyID"] = specialIDToSankIDMap[reuseLabel];
		        removeNodesLabel.shift();
	        }
	        else{
		        //don't have anymore to resuse
		        currentMaxID += 1;
		        nNode["sankeyID"] = currentMaxID;
	        }
	    }
	    newSpecialIDToSankIDMap[curretnNodeLabel] = nNode["sankeyID"];
    })
    newEdges.forEach(function(nEdge){
	    console.log(nEdge);
	    nEdge["source"] = newSpecialIDToSankIDMap[ nEdge["sourceLabel"] ];
	    nEdge["sourceID"] = newSpecialIDToSankIDMap[ nEdge["sourceLabel"] ];
	    nEdge["target"] = newSpecialIDToSankIDMap[ nEdge["targetLabel"] ];
	    nEdge["targetID"] = newSpecialIDToSankIDMap[ nEdge["targetLabel"] ];
    })
    newNodes.sort(function(a,b){
	    return a['sankeyID'] - b["sankeyID"];
    })
    newEdges.sort(function(a,b){
	    return a["sourceID"] - b["targetID"];
    })
    specialIDToSankIDMap = newSpecialIDToSankIDMap;
    // console.log(specialIDToSankIDMap, newSpecialIDToSankIDMap, newEdges, newNodes);
    return {"nodes" : newNodes, "links" : newEdges};
    // sankeyVis.updateData({"nodes" : newNodes, "links" : newEdges});

}

function reMapEdges(edges){
    edges.forEach(function(nEdge){
	    nEdge["source"] = specialIDToSankIDMap[ nEdge["sourceLabel"] ];
	    nEdge["sourceID"] = specialIDToSankIDMap[ nEdge["sourceLabel"] ];
	    nEdge["target"] = specialIDToSankIDMap[ nEdge["targetLabel"] ];
	    nEdge["targetID"] = specialIDToSankIDMap[ nEdge["targetLabel"] ];
    })
    edges.sort(function(a,b){
	    return a["sourceID"] - b["targetID"];
    })
    return edges;		
}

function colorDropDownChange(){
    var colorOption = parseInt(Number($("#colorDropDown").val()));
    colorScaleLegend(colorOption);
    if(sankeyVis){
	    var runTimes = sankeyVis.changeNodeColor(colorOption);
	    if(colorOption == 1 || colorOption == 2){
	        var slowTimeTxt = (runTimes[0] * 0.000001).toFixed(3) + "s";
	        var fastTimeTxt = (runTimes[1] * 0.000001).toFixed(3) + "s";
	        $("#slowAttr").text(slowTimeTxt);
	        $("#fastAttr").text(fastTimeTxt);
	    }
	    else if(colorOption == 3){
	        $("#slowAttr").text(0);
	        $("#fastAttr").text(1);
	    }
    }
}


function showDatasetInfo(){
    var datasetName = dataSetInfo["dataName"] || "Unknown";
    var numbOfNodes = dataSetInfo["numbNodes"] || "Unknown";
    var string = "";
    string += "Name: " + datasetName + " \n";
    string += "Number of Processes: " + numbOfNodes + " \n";
    string += "Path: " + dataSetInfo["path"] + " \n";
    string += "Experiment: " + dataSetInfo["experiment"];
    alert(string);
}

// $('#showLabelBox').attr('checked',false);
$("#showLabelBox").on("change",function(){
    console.log("checkbox");
})

$(document).ready(function () {
    $("#showLabelBox").on("change",function(){
	    var checkBoxStatus = $("#showLabelBox").is(':checked');

	    showLabelBool = checkBoxStatus;
	    if(showLabelBool == true){
	        d3.selectAll('.node text').style('opacity', 1);
	    }
	    else{
	        d3.selectAll('.node text').style('opacity', 0);
	    }				
    })

    $('#setNodeSizeBtr').on('click', function(){
	    var val = parseInt($('#nodeSize').val());
	    maxNodeSize = val;
		
    })
    
    $("#setRangeBtr").on('click', function(){
	    var minVal;
	    var maxVal;

	    if( isNaN( parseInt($('#maxVal').val()) ) ){
	        maxVal = null
	    }
	    else{
	        maxVal = parseInt($('#maxVal').val());
	    }
	    if( isNaN( parseInt($('#minVal').val()) ) ){
	        minVal = null
	    }
	    else{
	        minVal = parseInt($('#minVal').val());
	    }

	    if(minVal != null && maxVal != null && ( minVal < 1 || minVal > maxVal )){
	        alert("Please make sure that minimun value is >= 1 and min val <= max value")
	    }
	    var colorOption = parseInt(Number($("#colorDropDown").val()));
	    if(colorOption == 1 || colorOption == 2 && sankeyVis){
	        sankeyVis.setGlobalRange(colorOption, minVal, maxVal);
	    }
	    if(colorOption == 1 || colorOption == 2){
	        if( !isNaN( parseInt($('#minVal').val()) ) ){
		        var slowTimeTxt = (minVal).toFixed(3) + "s";
		        $("#slowAttr").text(slowTimeTxt);
	        }
	        if( !isNaN( parseInt($('#maxVal').val()) ) ){
		        var fastTimeTxt = (maxVal).toFixed(3) + "s";	
		        $("#fastAttr").text(fastTimeTxt);
	        }
	    }
	    else if(colorOption == 3){
	        $("#slowAttr").text(0);
	        $("#fastAttr").text(1);
	    }
	    else{
	        $("#slowAttr").text("N/A");
	        $("#fastAttr").text("N/A");
	    }
    })
});
