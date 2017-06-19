//split contains the following
// {
// 	"option" : split by functions or parents
// 	"sankeyLabel" : the label of the sankey node to split
// 	"functions" : an array of proc ids when split by functions
// }

var nodeSplit = function(sankeyNodesC, sankeyEdgesC, nodeListC, edgeListC, adjMatrixC, nodeInfoC, connectionInfoC, splitC){

	var sankeyNodes = {};
	var sankeyEdges = {};
	var nodeList = nodeListC;
	var edgeList = {};
	var adjMatrix = {};
	var nodeInfo = {};
	var connectionInfo = {};
	var split = splitC;


	sankeyNodes = JSON.parse(JSON.stringify( sankeyNodesC ));
	sankeyEdges = JSON.parse(JSON.stringify( sankeyEdgesC ));
	adjMatrix = JSON.parse(JSON.stringify( adjMatrixC ));
	nodeInfo = JSON.parse(JSON.stringify( nodeInfoC ));
	connectionInfo = JSON.parse(JSON.stringify( connectionInfoC ));
	edgeList = JSON.parse(JSON.stringify(edgeListC));

	var splitOption = split["option"];
	var nodeToSplitLabel = split["sankeyLabel"]; 

	var sankeyNodeLMIDToIDMap = {};
	var maxID = 0;

	var maxLMID = 0;
	Object.keys(sankeyNodes).forEach(function(lab){
		maxLMID = Math.max(maxLMID, parseInt(lab));

		var sankID = sankeyNodes[lab]["sankeyID"]
		sankeyNodeLMIDToIDMap[lab] = sankID;
		maxID = Math.max(maxID, sankID);

	})

	// console.log('there are,', sankeyEdges.length);

	var rootRunTime = sankeyNodes[0]["rawRunTime"];
	console.log(rootRunTime);
	var FILTERPERCENT = 1 / 100;

	function splitByFunction(){
		var nodeToSplit = sankeyNodes[nodeToSplitLabel];

		var newNodes = {};
		var newConnections = {};

		var procIDs = split["functions"].map(function(item) {
						    return parseInt(item, 10);
						});
		procIDs.forEach(function(procID){
			maxLMID = maxLMID + 1;
			maxID = maxID + 1;

			newNodes[procID] = {
				"sankeyID" : maxID,
				"name" : split["functionNames"][procID] ,
				"specialID" : maxLMID,
				"runTime" : 0,
				"oldSpecialID" : maxLMID,
				"uniqueNodeID" : [],
				"sankeyNodeList" : []
			};
			newConnections[procID] = [];

			sankeyNodeLMIDToIDMap[maxLMID] = maxID;
		});
		var keepConnection = [];
		var uniqueIDs = [];
		connectionInfo[nodeToSplitLabel].forEach(function(conn){
			var connProcID = parseInt(conn["procedureID"]);
			if(procIDs.indexOf(connProcID) > -1){
				newConnections[connProcID].push(conn);
				newNodes[connProcID]["uniqueNodeID"].push(conn["nodeID"]);
				conn["loadModID"] = newNodes[connProcID]["specialID"];
				nodeInfo[conn["nodeID"]]["loadModID"] = newNodes[connProcID]["specialID"];
				// console.log( conn["nodeID"] ,nodeInfo[conn["nodeID"]]["loadModID"])
			}
			else{
				keepConnection.push(conn);
				uniqueIDs.push(conn["nodeID"]);
			}
		})

		sankeyNodes[nodeToSplitLabel]["uniqueNodeID"] = uniqueIDs;
		keepConnection.forEach(function(conn){
			if(procIDs.indexOf(conn["parentProcedureID"]) > -1){
				conn["parentLoadModID"] = newNodes[conn["parentProcedureID"]]["specialID"];
				conn["parentLoadModuleName"] = newNodes[conn["parentProcedureID"]]["name"];
			}
			
		})
		connectionInfo[nodeToSplitLabel] = keepConnection;

		edgeList[nodeToSplitLabel] = keepConnection;

		var resNewNodes = {};
		var resNewConns = {};
		Object.keys(newNodes).forEach(function(lab){
			resNewNodes[ newNodes[lab]["specialID"] ] = newNodes[lab];
			resNewConns[ newNodes[lab]["specialID"] ] = newConnections[lab];
			edgeList[ newNodes[lab]["specialID"] ] = newConnections[lab];

		});

		return {"nodes" : resNewNodes, "conns" : resNewConns};
	}

	function reconstructAdjMatrix(){
		var res = splitByFunction();
		var nodeToChecks = removeConnectionInAdjMatrix();
		var newNodes = res["nodes"];
		var newConns = res["conns"];

		var newEdgesVal = {};
		var newEdgesAvgVal = {};
		var nEdges = {};
		var nodeIDConnection = {};

		nodeToChecks.push(nodeToSplitLabel);
		Object.keys(newNodes).forEach(function(lab){
			// nodeToChecks.push(lab);
			adjMatrix[lab] = [];
			var connections = newConns[lab];
			connections.forEach(function(conn){
				var nodeID = conn["nodeID"];
				var parentNodeID = conn["parentNodeID"];
				var parentLMID = nodeInfo[parentNodeID]["loadModID"];

				// var index = adjMatrix[parentLMID].indexOf( lab.toString() );

				// if( index < 0){
				// 	adjMatrix[parentLMID].push(lab);
				// }

				if(newEdgesVal[parentLMID] == null){
					newEdgesVal[parentLMID] = {};
					newEdgesAvgVal[parentLMID] = {};
					nodeIDConnection[parentLMID] = {};
				}
				if(newEdgesVal[parentLMID][lab] == null){
					newEdgesVal[parentLMID][lab] = 0;
					newEdgesAvgVal[parentLMID][lab] = 0;
					nodeIDConnection[parentLMID][lab] = [];
				}
				if(conn["type"] == "PF" || conn["type"] == "PR"){
					newEdgesVal[parentLMID][lab] += conn["rawTime"];
					newEdgesAvgVal[parentLMID][lab] += conn["value"];
					if(nodeIDConnection[parentLMID][lab].indexOf(nodeID) == -1){
						nodeIDConnection[parentLMID][lab].push(nodeID);
					}
					
				}
			})

		});

		console.log(nodeToChecks);
		var temp = 0;
		nodeToChecks.forEach(function(nodeLab){
			var connections = connectionInfo[nodeLab];
			// if(nodeLab == "7169"){
			// 	console.log("this many connections", connections.length);
			// }
			connections.forEach(function(conn){
				if(conn["type"] == "PF" || conn["type"] == "PR"){
					var nodeID = conn["nodeID"];
					var parentNodeID = conn["parentNodeID"];
					var parentLMID = nodeInfo[parentNodeID]["loadModID"];

					if(nodeLab == "7169" && parentLMID == '7164'){
						temp += conn["value"];
						// console.log(conn);
					}
					if(newEdgesVal[parentLMID] == null){
						newEdgesVal[parentLMID] = {};
						newEdgesAvgVal[parentLMID] = {};
						nodeIDConnection[parentLMID] = {};
					}
					if(newEdgesVal[parentLMID][nodeLab] == null){
						newEdgesVal[parentLMID][nodeLab] = 0;
						newEdgesAvgVal[parentLMID][nodeLab] = 0;
						nodeIDConnection[parentLMID][nodeLab] = [];
					}
					newEdgesVal[parentLMID][nodeLab] += conn["rawTime"];
					newEdgesAvgVal[parentLMID][nodeLab] += conn["value"];
					if(nodeIDConnection[parentLMID][nodeLab].indexOf(nodeID) == -1){
						nodeIDConnection[parentLMID][nodeLab].push(nodeID);
					}

					// console.log(parentNodeID, parentLMID);
					// if(adjMatrix[parentLMID] != null){
					// 	var index = adjMatrix[parentLMID].indexOf( nodeLab.toString() );

					// 	if( index < 0){
					// 		adjMatrix[parentLMID].push(nodeLab);
					// 	}
					// }
				}
				
			})
		})

		// console.log(rootRunTime, temp, temp > rootRuntime * FILTERPERCENT)

		// console.log(newEdgesVal);

		Object.keys(newEdgesVal).forEach(function(parentLMID){
			var newEdges = newEdgesVal[parentLMID];
			Object.keys(newEdges).forEach(function(nodeLab){
				// console.log(parentLMID, nodeLab, newEdgesVal[parentLMID][nodeLab] > rootRuntime * FILTERPERCENT, newEdgesVal[parentLMID][nodeLab], rootRuntime * FILTERPERCENT)
				// console.log(parentLMID, nodeLab);
				if(newEdgesVal[parentLMID][nodeLab] > rootRuntime * FILTERPERCENT){
					// console.log(parentLMID, nodeLab, adjMatrix[parentLMID]);
					var index = adjMatrix[parentLMID].indexOf( nodeLab.toString() );
					if(index < 0 && nodeLab != parentLMID){
						adjMatrix[parentLMID].push(nodeLab);
						if(parentLMID == "7164" && nodeLab == "7173"){
							// console.log("found")
						}
					}
					if(nEdges[parentLMID] == null){
						nEdges[parentLMID] = {};
					}
					if(nEdges[parentLMID][nodeLab] == null){
						nEdges[parentLMID][nodeLab] = 0;
					}
					nEdges[parentLMID][nodeLab] = newEdgesAvgVal[parentLMID][nodeLab];



				}
			})
		})

		Object.keys(newNodes).forEach(function(lab){
			nodeToChecks.push(lab);
			sankeyNodes[lab] = newNodes[lab];
			connectionInfo[lab] = newConns[lab];


		});		
		// console.log(sankeyNodes);

		// console.log(sankeyNodeLMIDToIDMap);

		return {"nodeToChecks" : nodeToChecks, "newEdges" : nEdges, "nodeIDConnection" : nodeIDConnection};

	}

	function removeConnectionInAdjMatrix(){

		var nodeToChecks = [];

		var removedConnections = {};

		var labelList = Object.keys(adjMatrix);
		labelList.forEach(function(lab){
			if(parseInt(lab) == parseInt(nodeToSplitLabel)){

				var conns = JSON.parse(JSON.stringify(adjMatrix[nodeToSplitLabel]));
				conns.forEach(function(conn){
					if(removedConnections[nodeToSplitLabel] == null){
						removedConnections[nodeToSplitLabel] = [];
					}
					if(removedConnections[nodeToSplitLabel].indexOf(conn) == -1){
						removedConnections[nodeToSplitLabel].push(conn);
					}
				})

				nodeToChecks = adjMatrix[nodeToSplitLabel];

				nodeToChecks.forEach(function(tLab){
					var sLab = nodeToSplitLabel;
					var index = -1;
					sankeyEdges.some(function(edge, idx){
						if(edge["sourceLabel"] == sLab && edge["targetLabel"] == tLab){
							index = idx;
							return true;
						}
					});

					if(index > -1){
						sankeyEdges.splice(index, 1);
					}
				})

				adjMatrix[nodeToSplitLabel] = [];
			}
			else{
				var removeIndex = adjMatrix[lab].indexOf( nodeToSplitLabel.toString() );
				if(removeIndex > -1){
					adjMatrix[lab].splice(removeIndex, 1);
					var index = -1;
					sankeyEdges.some(function(edge, idx){
						if(edge["sourceLabel"] == lab && edge["targetLabel"] == nodeToSplitLabel){
							index = idx;
							return true;
						}
					});

					if(index > -1){
						sankeyEdges.splice(index, 1);
					}					 

					if(removedConnections[lab] == null){
						removedConnections[lab] = [];
					}
					if(removedConnections[lab].indexOf(nodeToSplitLabel) == -1){
						removedConnections[lab].push(nodeToSplitLabel);
					}

				}
			}
		});

		// sankeyEdges.forEach(function(edge){
		// 	console.log(edge["sourceLabel"], edge["targetLabel"]);
		// })

		console.log(removedConnections);

		return nodeToChecks;
	}

	function calcNewEdges(){
		var tempEdge = [];
		var res = reconstructAdjMatrix();
		var nodeToChecks = res["nodeToChecks"];
		var newEdges = res["newEdges"];
		var nodeIDConnection = res["nodeIDConnection"];
		// console.log(newEdges);
		var sourceLabs = Object.keys(newEdges);
		sourceLabs.forEach(function(lab){
			var sourceLab = lab;
			var targetLabs = Object.keys(newEdges[sourceLab]);
			// if(sourceLab == "7164"){
			// 	console.log(targetLabs);
			// }
			targetLabs.forEach(function(targetLab){

				if(sourceLab != targetLab){
					var edgeValue = newEdges[sourceLab][targetLab];
					var temp = {
						"source" : sankeyNodeLMIDToIDMap[sourceLab],
						"target" : sankeyNodeLMIDToIDMap[targetLab],
						"sourceID" : sankeyNodeLMIDToIDMap[sourceLab],
						"targetID" : sankeyNodeLMIDToIDMap[targetLab],
						"sourceLabel" : sourceLab,
						"targetLabel" : targetLab,
						"value" : edgeValue, 
						"nodeIDList" : nodeIDConnection[sourceLab][targetLab]
					}	

					// var index = -1;
					// sankeyEdges.some(function(edge, idx){
					// 	if(edge["sourceLabel"] == sourceLab && edge["targetLabel"] == targetLab){
					// 		index = idx;
					// 		return true;
					// 	}
					// });

					// console.log(sourceLab, targetLab, index);

					// if(index > -1){
					// 	sankeyEdges.splice(index, 1);
					// }

					// console.log(temp);
					sankeyEdges.push(temp);		
					// tempEdge.push(temp);	

					// if(sourceLab == "7164" && targetLab == "7173"){
					// 	console.log("found the edge, " , temp);
					// }

				}
			})// end of targetLabs
		}) //end of nodesToChecks

		// console.log(tempEdge.length);
		// console.log(newEdges);
	} // end of calcNewEdges()

	this.nodeSplit = function(){
		// reconstructAdjMatrix();
		calcNewEdges();
		console.log(adjMatrix);

		// console.log("there are ", sankeyEdges.length);

		// return {"nodes" : sankeyNodes, "edges" : sankeyEdges};
		var graph = {"nodes" : sankeyNodes, "edges" : sankeyEdges, "nodeList" : nodeList, "edgeList" : edgeList, "connInfo" : connectionInfo, "adjMatrix" : adjMatrix}
		return {"graph" : graph, "nodeInfo": nodeInfo};
	}
}

module.exports = nodeSplit;