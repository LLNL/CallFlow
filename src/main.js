// ////////////// file paths for the data///////////////
var fs = require('fs');
var argv = require('yargs').argv;
var filePath;
var xmlFile;
var nodeMetricFile;
var configFile;
var dataSetFile;
var dataSetInfo;
if(!argv.d){
	console.log("I do not know where to look for the data set");
	return;
}
else{
	dataSetFile = argv.d;
}
if(!fs.existsSync(dataSetFile)){
	console.log('Sorry no such dataset exist at', dataSetFile);
	return;
}
else{
	dataSetInfo = require(dataSetFile);
}
if(dataSetInfo["path"] == null){
	console.log('I need the path information');
	return;
}
else{
	filePath = dataSetInfo["path"];
}
if( dataSetInfo["experiment"] == null || !fs.existsSync(filePath + dataSetInfo["experiment"])){
	console.log('No xml file found at', filePath + dataSetInfo["experiment"])
	return;
}
else{
	xmlFile = filePath + dataSetInfo["experiment"];
}
if( dataSetInfo["nodeMetric"] == null || !fs.existsSync(filePath + dataSetInfo["nodeMetric"]) ){
	console.log('No metric file found at', filePath + dataSetInfo["nodeMetric"])
	return;
}
else{
	nodeMetricFile = filePath + dataSetInfo["nodeMetric"];
}
if( dataSetInfo["config"] != null){
	configFile = filePath + dataSetInfo["config"];
}


var path = require('path'),
    express = require('express'),
    app = express(),
    LineByLineReader = require('line-by-line'),
    TreeModel = require('tree-model'),
    server = require('http').Server(app);
var port = process.env.PORT || 8500,
host = process.env.HOST || "localhost"; 
// host = process.env.HOST || "detoo.cs.ucdavis.edu";

app.use(express.static(__dirname + '/public'));

// Add a SumArray method to all arrays by expanding the Array prototype(do this once in a general place)
Array.prototype.SumArray = function (arr) {
    var sum = [];
    if (arr != null && this.length == arr.length) {
        for (var i = 0; i < arr.length; i++) {
            sum.push(this[i] + arr[i]);
        }
    }

    return sum;
}

var xmlTree;

var nodeMetric = {};
var nodeMetricReader = new LineByLineReader(nodeMetricFile);
var callMetrixData;
var entryExitData;

var clusterMetrix = {};
var clusterList = {};

var numberOfClusters = 16;

var lmMatrix = {};
var loadModuleTable;
var procedureTable;

var res_global = null; //this is use to return the data to the browser

var calcLM3 = require('./sankeyCalc.js');


var sankeySplitNode = require('./xmlParser.js');


var LMInternalCallPath;
var sanKeyMetricData;

var nodeInfo;

var entry;
var exit;

var nodeArray;
var sanKeyMetricDataLM;


var sankeyData;
var nodeRemove;

var procIDArray = [];
var splitParentList = {};
var splitByParentList = [];

var entryExitDataNodeSplit;
var nodePaths;

var functionList;

var options = {
  mode: 'text',
  pythonPath: 'python3',
  scriptPath: './',
  pythonOptions: ['-u'],
  args: [numberOfClusters]
};

var date1;
var date2;

var staticGraph; //this is the static graph we can load upond page refresh;
var staticFunctionList;
var nodeIDKeep = []; //a array of node id got when read in the metric file

nodeMetricReader.on('line', function(line){
	var myOBJ = JSON.parse(line);
	if(parseInt(myOBJ.id) == 1){
		// console.log(myOBJ);
	}
	// console.log(myOBJ["id"]);

	nodeIDKeep.push( parseInt(myOBJ.id) );

	nodeMetric[myOBJ.id] = myOBJ;
});

nodeMetricReader.on('end', function(){

	console.log('done with reading metric data, begin reading xml file');
	// var xmlFile = new fileLoader('../../data/miranda1/experiment.xml', myCallBack);
	date1 = new Date();
	var xml2 = new sankeySplitNode(xmlTree, xmlFile, sankeySplitNodeCallBack,configFile , [-99999], nodeMetric, [], nodeIDKeep);		

});

function sankeySplitNodeCallBack(data){
	console.log('done spliting node, begin calc edges');
	nodeArray = data["nodeArray"];
	sanKeyMetricDataLM = data["sanKeyMetricDataLM"];
	entryExitDataNodeSplit = data["entryExitData"];
	nodePaths = data["nodePaths"];
	procedureTable = data["procedureTable"];

	//from the nodeSplitMiranda.js
	var finalTree = data["finalTree"];
	var keepEdges = data["keepEdges"];
	var nodeList = data["nodeList"];
	var keepEdges = data["keepEdges"];
	staticFunctionList = data["functionList"];

	var connectionInfo = data["connectionInfo"];

	var cTime1 = new Date();
	// var lmcalc = new calcLM3(nodeArray, nodeMetric, sanKeyMetricDataLM, nodePaths);
	var lmcalc = new calcLM3(nodeArray, nodeMetric, sanKeyMetricDataLM, nodePaths, connectionInfo);

	// var lmcalc = new calcMiranda(finalTree, nodeList, nodePaths, nodeMetric, keepEdges);

	var result = lmcalc.compute();
	sankeyData = result["newSankey"];
	// nodeRemove = result["nodeRemove"];

	date2 = new Date();

	var diff = date2 - date1;
	// console.log("the time it take to load and calc is, ", diff);
	// console.log('the time it take to calc the edges is', date2 - cTime1);

	var nodesDeepCopy = [];
	var edgesDeepCopy = [];
	var nodeListDeepCopy = {};
	var edgeListDeepCopy = {};
	sankeyData["edges"].forEach(function(edge){
		var tempObj = JSON.parse(JSON.stringify(edge));
		edgesDeepCopy.push(tempObj);
	});
	nodesDeepCopy = JSON.parse(JSON.stringify( sankeyData["nodes"] ));
	nodeListDeepCopy = JSON.parse(JSON.stringify( sankeyData["nodeList"] ));
	edgeListDeepCopy = JSON.parse(JSON.stringify( sankeyData["edgeList"] ));

	staticGraph = {"nodes" : nodesDeepCopy, "edges" : edgesDeepCopy, "nodeList" : nodeListDeepCopy, "edgeList" : edgeListDeepCopy}

	server.listen(port, host, function(){
		console.log("Sever started, listening", host, port);
	})		
}

app.get('/', function(req, res){
	splitByParentList = [];
	procIDArray = [];

	functionList = staticFunctionList;

	res.sendFile(__dirname + '/index.html');
});

app.get('/data', function(req, res){
	runPython(res);
})

app.get('/getNodeMetrics', function(req, res){
	res.json(nodeMetric);
})

app.get('/procedureTable', function(req, res){
	res.json(procedureTable);
})

app.get('/getSankey', function(req, res){
	// var lmID = parseInt(req.query["lmID"]);
	// res_global = res;
	// getSankey(lmID);

	// console.log("getting the sankey data");
	// res.json(sankeyData);

	// var temp = {"nodes" : staticGraph["nodes"], "edges" : staticGraph["edges"]};
	// fs.writeFileSync("nodeEdgeTest.json", JSON.stringify(temp));
	procIDArray = [];
	splitByParentList = [];
	sankeyData = staticGraph;
	var hisData = computeHistogram();
	var resData = {"graph" : staticGraph, "histogramData" :  hisData}
	res.json(resData);
})

app.get('/splitNode', function(req, res){
	// var level = parseInt( req.query["nodeLevel"] )
	// var specialID = req.query["specialID"];
	// var highestProc = calcHighestProcs(level, specialID);

	// var myID = parseInt(highestProc["procID"])

	var idList = req.query["idList"]

	idList.forEach(function(sID){
		var myID = parseInt(sID);
		if(procIDArray.indexOf(myID) == -1 || procIDArray.length == 0){
			procIDArray.push(myID);
		}		
	})

	res_global = res;

	// var xml2 = new sankeySplitNode('../../data/miranda1/experiment.xml', splitNodeCallBack, procIDArray);
	var xml2 = new sankeySplitNode(xmlTree, xmlFile, splitNodeCallBack2,configFile, procIDArray, nodeMetric, splitByParentList, nodeIDKeep);	
})

app.get('/getList', function(req, res){
	var level = parseInt( req.query["nodeLevel"] )
	var specialID = req.query["specialID"];	


	var tempList = [];
	entryExitDataNodeSplit[specialID]["enter"].forEach(function(entryDat){
		var name = procedureTable[entryDat];
		var tempObj = {"name" : name, "procID" : entryDat};
		tempList.push(tempObj)
	});
	res.json( tempList );
})

//this get the functions of more than one lms
app.get('/getLists', function(req, res){
	var specialID = req.query["specialID"];
	if(functionList[specialID] != null){
		var functionListResult = {};
		var functionListObject = functionList[specialID];
		functionListObjectKeys = Object.keys(functionListObject);
		functionListObjectKeys.forEach(function(procedureID){
			if(functionListResult[procedureID] == null){
				functionListResult[procedureID] = {
					'procID' : procedureID,
					'name' : procedureTable[procedureID],
					'value' : 0
				}
			}

			var nodeIDList = functionList[specialID][procedureID];
			nodeIDList.forEach(function(nodeID){
				var incTime = nodeMetric[nodeID]["inc"];
				incTime.forEach(function(val, idx){
					functionListResult[procedureID]["value"] += val;
				})
			})
		});

		res.json(functionListResult)
	}
	else{
		// console.log("Cannot find function list for", specialID);
		res.json({})
	}
})

app.get('/getRuntimeOfNode', function(req, res){
    var idOfNode = parseInt(req.query["nodeID"]);
    var levelOfNode = parseInt(req.query["nodeLevel"]);
    var lmIDofNode;// = parseInt(req.query["lmID"]);

    // if(req.query["name"] == "root"){
    // 	lmIDofNode = "root";
    // }
    // else{
    	lmIDofNode = parseInt(req.query["lmID"]);
    // }

    var procIDofNode = req.query["specialID"];

    // var nodeOfInterest = sanKeyMetricData[lmIDofNode][levelOfNode][procIDofNode];
    var nodeOfInterest = sanKeyMetricDataLM[levelOfNode][procIDofNode];
    var nodeIDs = [];
    var sumsInc = [];
    var sumsExc = [];
    nodeOfInterest.forEach(function(node, idx){
    	// console.log(node["nodeID"], node);
    	nodeIDs.push(node["nodeID"]);
    });

    nodeIDs.forEach(function(id, idx){
    	//grab runtime for this id
    	var runTimes = nodeMetric[id];

    	if(idx == 0){
    		sumsInc = runTimes["inc"];
    		sumsExc = runTimes["exc"];
    	}
    	else{
    		sumsInc = sumsInc.SumArray(runTimes["inc"]);
    		sumsExc = sumsExc.SumArray(runTimes["exc"]);
    	}
    });

    res.json({"inc" : sumsInc, "exc" : sumsExc});
})

app.get('/splitNodeByParents', function(req,res){
	// splitParentList
	var parentProcList = req.query["parentProcList"];
	var nodeLabel = req.query["nodeLabel"];
	var specIDofSplitNode = req.query["nodeSpecialID"];

	if(splitByParentList.indexOf(specIDofSplitNode) == -1){
		splitByParentList.push(specIDofSplitNode);
	}

	res_global = res;

	var xml2 = new sankeySplitNode(xmlTree, xmlFile, splitNodeCallBack2,configFile , procIDArray, nodeMetric, splitByParentList, nodeIDKeep);	
})

app.get('/getHistogramScatterData', function(req, res){

	var sankeyID = req.query["sankeyID"];	
	var specialID = req.query["specialID"];

	var node = sankeyData["nodes"][specialID];
	var uniqueNodeIDList = node["uniqueNodeID"];


	var tempInc = [];
	var tempExc = [];
	uniqueNodeIDList.forEach(function(nodeID, idx){
		var incRuntime = nodeMetric[parseInt(nodeID)]["inc"];
		var excRuntime = nodeMetric[parseInt(nodeID)]["exc"];
		if(idx == 0){
			tempInc = incRuntime;
			tempExc = excRuntime;
		}
		else{
			tempInc = tempInc.SumArray( incRuntime );
			tempExc = tempExc.SumArray( excRuntime );
		}
	});	

	res.json({"inc": tempInc, "exc": tempExc});	
})

app.get('/calcEdgeValues', function(req, res){

	//this could be a problem when there are lots of edges
	var edgeSet1 = [];
	var edgeSet2 = [];
	var tempEdges = sankeyData["edges"].slice();

	var processID = req.query["processIDList"];
	var processIDList = [];
	processID.forEach(function(pID){
		processIDList.push( parseInt(pID) );
	})


	tempEdges.forEach(function(edge){
		var idList = edge["nodeIDList"];
		var edgeValueForBrush = 0;
		
		var edgeValueForNonBrush = 0;
		

		idList.forEach(function(id){
			var runTime = nodeMetric[id]["inc"];
			var numberOfIDInBrush = 0;
			var numberOfIDnotBrush = 0;
			var tempValBrush = 0;
			var tempValNonBrush = 0;
			// processIDList.forEach(function(procid){
			// 	edgeValue += runTime[procid];
			// })
			// console.log(runTime);
			runTime.forEach(function(val, idx){
				if( processIDList.indexOf(idx) > -1 ){
					// edgeValueForBrush += val;
					numberOfIDInBrush += 1;
					tempValBrush += val;
				}
				else{
					// edgeValueForNonBrush += val;
					numberOfIDnotBrush += 1;
					tempValNonBrush += val;
				}
			})
			edgeValueForBrush += tempValBrush / Math.max(numberOfIDInBrush, 1);
			edgeValueForNonBrush += tempValNonBrush / Math.max(numberOfIDnotBrush, 1);

		})
		var tempE1 = JSON.parse(JSON.stringify(edge));
		tempE1["value"] = edgeValueForBrush;

		edgeSet1.push(tempE1);

		var tempE2 = JSON.parse(JSON.stringify(edge));
		tempE2["value"] = edgeValueForNonBrush;

		edgeSet2.push(tempE2);
	});	

	res.json( {"brush" : edgeSet1, "nonBrush" : edgeSet2} );
})

function splitNodeCallBack(data){
	nodeArray = data["nodeArray"];
	sanKeyMetricDataLM = data["sanKeyMetricDataLM"];

	var lmcalc = new calcLM3(nodeArray, nodeMetric, sanKeyMetricDataLM);
	var result = lmcalc.compute();
	sankeyData = result["newSankey"];
	nodeRemove = result["nodeRemove"];	

	console.log('done with split node');
	res_global.json(sankeyData);

}

function splitNodeCallBack2(data){
	nodeArray = data["nodeArray"];
	sanKeyMetricDataLM = data["sanKeyMetricDataLM"];
	entryExitDataNodeSplit = data["entryExitData"];
	nodePaths = data["nodePaths"];
	procedureTable = data["procedureTable"];

	//from the nodeSplitMiranda.js
	var finalTree = data["finalTree"];
	var keepEdges = data["keepEdges"];
	var nodeList = data["nodeList"];
	var keepEdges = data["keepEdges"];
	functionList = data["functionList"];

	var connectionInfo = data["connectionInfo"];

	var cTime1 = new Date();
	// var lmcalc = new calcLM3(nodeArray, nodeMetric, sanKeyMetricDataLM, nodePaths);
	var lmcalc = new calcLM3(nodeArray, nodeMetric, sanKeyMetricDataLM, nodePaths, connectionInfo);

	// var lmcalc = new calcMiranda(finalTree, nodeList, nodePaths, nodeMetric, keepEdges);

	var result = lmcalc.compute();
	sankeyData = result["newSankey"];	
	console.log('done with split node');

	// var temp = {"nodes" : sankeyData["nodes"], "edges" : sankeyData["edges"]};
	// fs.writeFileSync("nodeEdgeTest2.json", JSON.stringify(temp));

	var hisData = computeHistogram();
	var resData = {"graph" : sankeyData, "histogramData" :  hisData}

	// res_global.json(sankeyData);
	res_global.json(resData);	
}

//this function compute a mini histogram for each speical ID
function computeHistogram(){
	var sankeyNodes = sankeyData["nodes"];

	var histogramData = {};
	var numbOfBins = 20;
	var maxFreq = 0;
	var globalXvals;

	var specialIDs = Object.keys(sankeyNodes);
	specialIDs.forEach(function(specialID){
		var sankNode = sankeyNodes[specialID];
		var uniqueNodeIDList = sankNode["uniqueNodeID"];
		var tempInc = [];
		//calculate runtime for this sank node
		uniqueNodeIDList.forEach(function(nodeID, idx){
			var incRuntime = nodeMetric[parseInt(nodeID)]["inc"];
			if(idx == 0){
				tempInc = incRuntime;
			}
			else{
				tempInc = tempInc.SumArray( incRuntime );
			}
		});	

		//This section will bin the data////

		var dataSorted = tempInc.slice();
		dataSorted.sort(function(a,b){
			return a - b;
		});

		//compute the average of this sankey node
		var average = 0;
		var sumVal = 0;
		dataSorted.forEach(function(val){
			sumVal += val;
		});

		average = sumVal / dataSorted.length;



		var dataMin = dataSorted[0];
		var dataMax = dataSorted[ dataSorted.length - 1 ];

		// console.log('the max-min/avg is',  (dataMax - dataMin) / average );

		sankeyNodes[specialID]["nRange"] = (dataMax - dataMin) / average;

		var dataWidth = ((dataMax - dataMin) / numbOfBins);
		var freq = [];
		var binContainsProcID = {};
		var xVals = [];
		for(var i = 0; i < numbOfBins; i++){
			xVals.push(i);
			freq.push(0);
		};		

		tempInc.forEach(function(val, idx){
			var pos = Math.floor( (val - dataMin) / dataWidth );
			if(pos >= numbOfBins){
				pos = numbOfBins - 1;
			}
			freq[pos] += 1;
			maxFreq = Math.max(maxFreq, freq[pos]);
		});


		histogramData[specialID] = {
			"numbOfBins" : numbOfBins,
			"freq" : freq,
			"xVals" : xVals
		}
		globalXvals = xVals;

	})

	return {"histogramData" : histogramData, "maxFreq" : maxFreq, "globalXvals" : globalXvals};
}








