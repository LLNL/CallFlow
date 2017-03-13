////////////// file paths for the data///////////////
var filePath = "../data/miranda/";
var configFilePath = filePath + "config2.json";
var metricFilePath = filePath + "nodeData.json";
var experimentFilePath = filePath + "experiment.xml";
/////////////////////////////////////////////


var fs = require('fs'),
    path = require('path'),
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

var nodeMetric = {};
var nodeMetricReader = new LineByLineReader(metricFilePath);
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

nodeMetricReader.on('line', function(line){
	var myOBJ = JSON.parse(line);
	if(parseInt(myOBJ.id) == 1){
		// console.log(myOBJ);
	}
	// console.log(myOBJ["id"]);
	nodeMetric[myOBJ.id] = myOBJ;
});

nodeMetricReader.on('end', function(){

	console.log('done with reading metric data, begin reading xml file');
	// var xmlFile = new fileLoader('../../data/miranda1/experiment.xml', myCallBack);
	date1 = new Date();
	var xml2 = new sankeySplitNode(experimentFilePath, sankeySplitNodeCallBack,configFilePath , [-99999], nodeMetric, []);		

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
	console.log("the time it take to load and calc is, ", diff);
	console.log('the time it take to calc the edges is', date2 - cTime1);

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
	console.log("getting the cluster data");
	splitByParentList = [];
	procIDArray = [];

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

	console.log("getting the sankey data");
	// res.json(sankeyData);

	// var temp = {"nodes" : staticGraph["nodes"], "edges" : staticGraph["edges"]};
	// fs.writeFileSync("nodeEdgeTest.json", JSON.stringify(temp));
	res.json(staticGraph);
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


	console.log(procIDArray);

	res_global = res;

	// var xml2 = new sankeySplitNode('../../data/miranda1/experiment.xml', splitNodeCallBack, procIDArray);
	var xml2 = new sankeySplitNode(experimentFilePath, splitNodeCallBack2,configFilePath , procIDArray, nodeMetric, splitByParentList);	
})

app.get('/getList', function(req, res){
	var level = parseInt( req.query["nodeLevel"] )
	var specialID = req.query["specialID"];	


	var tempList = [];
	entryExitDataNodeSplit[specialID]["enter"].forEach(function(entryDat){
		var name = procedureTable[entryDat];
		var tempObj = {"name" : name, "procID" : entryDat};
		console.log(name);
		tempList.push(tempObj)
	});
	res.json( tempList );
})

//this get the functions of more than one lms
app.get('/getLists', function(req, res){
	var specialIDs = req.query["specialIDs"];

	var functionLists = {};

	specialIDs.forEach(function(specialID){
		functionLists[specialID] = [];
		var functionlist = entryExitDataNodeSplit[specialID];
		if(functionlist["enter"] != null){
			functionlist["enter"].forEach(function(func){
				var name = procedureTable[func];

				console.log(functionlist["entryNodeID"])

				var nodesList = functionlist["entryNodeID"][func];

			    var sumsInc = [];
    			var sumsExc = [];
    			var nodeIDs = [];
				nodesList.forEach(function(node, idx){
					nodeIDs.push(node);
				});

				nodeIDs.forEach(function(id, idx){
			    	var runTimes = nodeMetric[id];

			    	if(idx == 0){
			    		sumsInc = runTimes["inc"];
			    		sumsExc = runTimes["exc"];
			    	}
			    	else{
			    		sumsInc = sumsInc.SumArray(runTimes["inc"]);
			    		sumsExc = sumsExc.SumArray(runTimes["exc"]);
			    	}					
				})

				var incSum = 0;
				sumsInc.forEach(function(val){
					incSum += val;
				})
				var excSum = 0;
				sumsExc.forEach(function(val){
					excSum += val;
				})

				var tempObj = {'name' : name, "procID" : func, "incTime" : incSum, "excTime": excSum};

				functionLists[specialID].push(tempObj);

			})
		}
	})

	res.json( functionLists );
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

    console.log(procIDofNode);

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

	// var parentList = Object.keys(parentProcList);
	// if(splitParentList[nodeLabel] == null){
	// 	splitParentList[nodeLabel] = {};
	// }
	// parentList.forEach(function(parName){
	// 	if(splitParentList[nodeLabel][parName] == null){
	// 		splitParentList[nodeLabel][parName] = [];
	// 	}

	// 	var procIDList = parentProcList[parName];
	// 	procIDList.forEach(function(myID){
	// 		myID = parseInt(myID);
	// 		if(splitParentList[nodeLabel][parName].indexOf(myID) == -1){
	// 			splitParentList[nodeLabel][parName].push(myID)
	// 		}
	// 	});
	// });

	if(splitByParentList.indexOf(specIDofSplitNode) == -1){
		splitByParentList.push(specIDofSplitNode);
	}

	res_global = res;

	var xml2 = new sankeySplitNode(experimentFilePath, splitNodeCallBack2,configFilePath , procIDArray, nodeMetric, splitByParentList);	
})


function splitNodeCallBack(data){

	console.log('done spliting node, begin calc edges');
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

	res_global.json(sankeyData);	
}