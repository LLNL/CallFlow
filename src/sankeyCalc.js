//this modual compute the sankey nodes and links for the load modual
var LMCalc = function(nodeArray, nodeMetric, sanKeyMetricData, nodePaths, connectionInfo){
	var fs = require('fs');
	var nodeRemove = [];

	var treeLevels = Object.keys(nodeArray);
	var rootSpecialID = "LM0";
	var rootRuntime;

	var edges = {};

	var newLMIDMapping = {};//this map the old lmid to the new one
	var newConnectionMap = {};
	var parentChildrenList = {};

	var FILTERPERCENT = 1 / 100;

	var nameList = {};


	function computeTime(){
		// console.log('begin computing runtime for each sankey node');
		treeLevels.forEach(function(treeLev){
			var lmAtLevelList = Object.keys(nodeArray[treeLev]);

			lmAtLevelList.forEach(function(lmAtLevel){
				var sankeyNode = nodeArray[treeLev][lmAtLevel];
				var nodeIDList = sankeyNode["uniqueID"];

	            var sumInc = 0;
	            var sumExc = 0;
	            var maxInc = 0;
	            var maxExc = 0;
	            var count = 0;
	            var incRunTimeArray;
	            var excRunTimeArray;
				nodeIDList.forEach(function(nodeID, idx){
	                var tempInc = nodeMetric[nodeID]["inc"];
	                var tempExc = nodeMetric[nodeID]["exc"];

	                var mySumInc = 0;
	                var mySumExc = 0;
	                if(idx == 0){
	                	incRunTimeArray = tempInc;
	                	excRunTimeArray = tempExc;
	                }
	                else{
	                	incRunTimeArray = incRunTimeArray.SumArray(tempInc);
	                	excRunTimeArray = excRunTimeArray.SumArray(tempExc);
	                }
	                tempInc.forEach(function(val){
	                    mySumInc += val;
	                })

	                tempExc.forEach(function(val){
	                    mySumExc += val;
	                })

	                sumInc += mySumInc;
	                sumExc += mySumExc;					
				}); //end nodeIDList
				nodeArray[treeLev][lmAtLevel]["incTime"] = sumInc;
	            nodeArray[treeLev][lmAtLevel]["excTime"] = sumExc;

	            nameList[lmAtLevelList] = nodeArray[treeLev][lmAtLevel]["name"];

			}); //end lmAtLevelList
		}); //end treeLevels
		// console.log("finish with computing runtime for each sankey node");
	}

	function filterNodes(){
		computeTime();
		// console.log('begin filtering nodes');

		rootRuntime = nodeArray[0][rootSpecialID]["incTime"];
		var nodesKeepAfterFilter = {};
		var notInterestSpecID = {};
		treeLevels.forEach(function(treeLev){
			// filterNodeData[treeLev] = {};
			nodesKeepAfterFilter[treeLev] = {};
			var lmAtLevelList = Object.keys(nodeArray[treeLev]);
			lmAtLevelList.forEach(function(lmAtLevel){
				var sankeyNode = nodeArray[treeLev][lmAtLevel];
				if(sankeyNode["incTime"] >= (FILTERPERCENT * rootRuntime) ){
					nodesKeepAfterFilter[treeLev][lmAtLevel] = sankeyNode;
				}
	            else{
	                if(notInterestSpecID[treeLev] == null){
	                    notInterestSpecID[treeLev] = [];
	                }

	                notInterestSpecID[treeLev].push(lmAtLevel);
	            }
			}); //end of lmAtLevelList
		}); //end of treeLevels

		treeLevels.forEach(function(treeLev, idx){
			if(idx > 0){
				var spcIDAtThisLevel = Object.keys(nodesKeepAfterFilter[treeLev]);
				var notInsSpcTemp = notInterestSpecID[treeLev - 1];
		        var notInt = [];
		        if(typeof notInsSpcTemp != "undefined"){

		            notInsSpcTemp.forEach(function(ni){
		                // notInt.push(parseInt(ni));
		                notInt.push(ni);
		            });
		        }

		        spcIDAtThisLevel.forEach(function(currentSpcID){
		        	var tempParentSpcID = nodesKeepAfterFilter[treeLev][currentSpcID]["parentSpecialID"];
		            notInt.forEach(function(nLMID){
		            	var nLMIDINT; //= parseInt(nLMID.replace('LM', ''));
		            	nLMIDINT = nLMID;
		                var tempIDX = tempParentSpcID.indexOf(nLMIDINT);

		                if(tempIDX >= 0){
		                    tempParentSpcID.splice(tempIDX, 1);
		                }
		                
		            });

		             nodesKeepAfterFilter[treeLev][currentSpcID]["parentSpecialID"] = tempParentSpcID;

		        })

			}		
		}); // end of treeLevels

		// console.log('finish with filtering nodes');
		return {"nodesKeepAfterFilter" : nodesKeepAfterFilter};
	}

	//this function group two node together if the following conditions hold
	//parent and child have the same lm
	//child only have one parent
	function groupNodeToParent(){
		var filterNodesReturn = filterNodes();
		var nodesKeepAfterFilter = filterNodesReturn["nodesKeepAfterFilter"];
		// console.log("begin groupNodeToParent");
		var newNodeArray = {};
		var newConnectionInfo = {};
		newNodeArray[0] = nodesKeepAfterFilter[0];
	    newConnectionInfo[0] = connectionInfo[0];
		var treeLevels = Object.keys(nodesKeepAfterFilter);

		treeLevels.forEach(function(treeLev, idx){
			if(idx > 0){ //skip root
				newNodeArray[treeLev] = {};
				newConnectionInfo[treeLev] = {};
				var lmAtLevelList = Object.keys(nodesKeepAfterFilter[treeLev]);
				var currentTreeLev = treeLev;
				lmAtLevelList.forEach(function(currentLMAtLevel){
		
					var mySpecialID = nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel]["specialID"];

	                //taking care of the easy case first, which has more than one parents
	                if(nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel]["parentSpecialID"].length > 1){


	                    var canMergeBool = false;
	                    var parentSameAsMeLevel;
	                    if(nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel]["parentSpecialID"].indexOf(currentLMAtLevel) > -1){
	                    	//so one of my parentspecialid is the same as me
	                    	var otherParentLevel = [];
	                    	
	                    	var parentsList = nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel]["parentSpecialID"];
	                    	parentsList.forEach(function(parSpcID){
		                    	for(var tIndex = parseInt(currentTreeLev) - 1; tIndex >= 0; tIndex--){
		                    		var spcIDAtThisLevel = Object.keys(newNodeArray[tIndex]);
		                    		if(currentLMAtLevel == "CLM3"){
		                    			// console.log(spcIDAtThisLevel, tIndex);
		                    		}
		                    		if(spcIDAtThisLevel.indexOf(parSpcID) > -1){
		                    			if(parSpcID == currentLMAtLevel){
		                    				parentSameAsMeLevel = tIndex;
		                    			}
		                    			else{
		                    				if(otherParentLevel.indexOf(parSpcID) == -1){
		                    					otherParentLevel.push(tIndex);
		                    				}
		                    			}
		                    			break;
		                    		}
		                    	}
	                    	}); // end of parentsList

	                    	if(otherParentLevel.indexOf(parentSameAsMeLevel) == -1 && typeof(parentSameAsMeLevel) != 'undefined'){
	                    		var largestBool = true;
	                    		otherParentLevel.forEach(function(lev){
	                    			if(lev >= parentSameAsMeLevel){
	                    				largestBool = false;
	                    			}
	                    		})
	                    		canMergeBool = largestBool;
	                    	}
	                    	else{
	                    		canMergeBool = false;
	                    	}

	                    }

	                    if(canMergeBool){
	                    	var currentConnectionInfo = connectionInfo[currentTreeLev][currentLMAtLevel];
                            currentConnectionInfo.forEach(function(connInfo){
                            	if(connInfo["specialID"] != connInfo["parentSpecialID"]){
	                                newConnectionInfo[parentSameAsMeLevel][currentLMAtLevel].push(connInfo);
                            	}
	                        });

                            var currentNode = nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel];
                            currentNode["uniqueID"].forEach(function(nodeID){
                            	newNodeArray[parentSameAsMeLevel][currentLMAtLevel]['uniqueID'].push(nodeID);
                            })

	                    }
	                    else{
	                    	newNodeArray[currentTreeLev][currentLMAtLevel] = nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel];
	                    	newConnectionInfo[currentTreeLev][currentLMAtLevel] = connectionInfo[currentTreeLev][currentLMAtLevel];
	                    }

	                }

	                //if only have one parent, but parent lmid is not the same as current node lmid
	                else if( nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel]["parentSpecialID"].length == 1 &&
	                		 nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel]["parentSpecialID"][0] != currentLMAtLevel){
	                	newNodeArray[currentTreeLev][currentLMAtLevel] = nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel];
	                    newConnectionInfo[currentTreeLev][currentLMAtLevel] = connectionInfo[currentTreeLev][currentLMAtLevel];
	                }

	                //if only have one parent and parent lmid is same as current node lmid
	                else if(nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel]["parentSpecialID"].length == 1 &&
	                		 nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel]["parentSpecialID"][0] == currentLMAtLevel){
	                	//look for the node with same lm from previous level
	                	for(var i = currentTreeLev -1; i >= 0; i--){
	                		var previousLevel = i;

	                        var prevLevelLM = Object.keys(newNodeArray[previousLevel]);

	                        //check if this prev level has the LM we want
	                        if(prevLevelLM.indexOf(currentLMAtLevel) > -1){

	                            var currentNode = nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel];
	                            currentNode["uniqueID"].forEach(function(nodeID){
	                            	newNodeArray[previousLevel][currentLMAtLevel]['uniqueID'].push(nodeID);
	                            })

	                            //found the node we want, break out of the loop
	                            return;
	                        }
	                        else{
	                            //continue with the for loop
	                        }
	                	} //end of for loop
	                }

				}); //end of lmAtLevelList
 			}

		}); //end of treeLevels
		// console.log("finish groupNodeToParent");
		return {"newNodeArray" : newNodeArray, "newConnectionInfo" : newConnectionInfo};
	}

	//this function combines nodes such that each lm only have one node
	//unless said node create a cycle we can't ignore
	function combineNodes(){
		// console.log("begin combineNodes");
		var groupNodeToParentReturn = groupNodeToParent();
		var newNodeArrayFromGroup = groupNodeToParentReturn["newNodeArray"];
		var newConnectionInfoFromGroup = groupNodeToParentReturn["newConnectionInfo"];

		treeLevels = Object.keys(newNodeArrayFromGroup);
		var newNodeArray = {};//the final node array
		var newConnectionInfo = {};//the final connection info

		// access uing the specialid of the current node
		// each contain an array of specialid of the parent
		// also contain the array of specialid of the children
		// when access, if the children filed is null, that mean we haven't seen this id yet

		
		// var needToChangeSpecialID = [];

		var seenBefore = []; //this keep track of all special id that we have seen before
		var connectTo = {}; //for each lmid, create an array to indicate which lmid it is connect to

		// newConnectionMap[parentLMID] = [
		// 	 {childOldSpecID: oldpscid, childNewSpcID: newspcid}
		// ]
		var newConnectionMap = {};

		treeLevels.forEach(function(treeLev, idx){
			if(idx > 0){
				newNodeArray[treeLev] = {};
				newConnectionInfo[treeLev] = {};
				var currentTreeLevel = treeLev;
				var lmAtLevelList = Object.keys(newNodeArrayFromGroup[treeLev]);
				lmAtLevelList.forEach(function(currentLM){

					//first, is there any specialid that we need to change
					var needToChangeSpecialID = Object.keys(newLMIDMapping);
					//grap the connection list for this specialID
					var currentConnList = newConnectionInfoFromGroup[treeLev][currentLM];

					//first determine if this node need to change its lable, need to combine, or keep it as is
					if(seenBefore.indexOf(currentLM) > -1){ //ok, so we seen this lm id before
						//now we need to determine if we need to change its label or need to combine

						if(newLMIDMapping[currentLM] == null){ //this is a node that we haven't determine to change its label yet, so we just combine it to the previous node
							calculateEdge(currentLM , currentConnList, false, "")
						}
						else{

							//this might be wrong, but assume that if we have a new mapping, we only have one name
							var newLabel = newLMIDMapping[currentLM][ newLMIDMapping[currentLM].length ];

							var newSankeyNode = newNodeArrayFromGroup[treeLev][currentLM];
							newSankeyNode["specialID"] = newLabel;
							if(parentChildrenList[newLabel] == null){
								parentChildrenList[newLabel] = {};
								parentChildrenList[newLabel]["parent"] = [];
							}
							
							calculateEdge(currentLM , currentConnList, true, newLabel)


						}

					}
					else{ //havent seen this lm id before
						//so we need to create a new sankey node
						var newSankeyNode = newNodeArrayFromGroup[treeLev][currentLM];
						seenBefore.push(currentLM);
						parentChildrenList[currentLM] = {};
						parentChildrenList[currentLM]["parent"] = [];
						calculateEdge(currentLM , currentConnList, false, "")
					}
				}); //end of lmAtLevelList
			}
			else{
				newNodeArray[0] = newNodeArrayFromGroup[0];
				newConnectionInfo[0] = newConnectionInfoFromGroup[0];
				var connInfoList = [];
				parentChildrenList["LM0"] = {};
				var childrenSpecID = [];
				newConnectionInfo[0]["LM0"].forEach(function(connInfo){
					// note that we only want the connInfo where the chldspcid is different from the current node
					if(connInfo["childSpecialID"] != "LM0"){
						connInfoList.push(connInfo);
						if(childrenSpecID.indexOf(connInfo["childSpecialID"]) == -1){
							childrenSpecID.push(connInfo["childSpecialID"]);
						}
					}
				});
				parentChildrenList["LM0"]["children"] = childrenSpecID;
				parentChildrenList["LM0"]["parent"] = [];
				// calculateEdge("LM0", connInfoList);
			}
		}); //end of treeLevels

		// console.log("finish combineNodes");
	}

	var labelList = {};
	var nodeList = {};
	var edgeList = {};

	var adjacencyMatrix = {};
	var idList = []
	var adjacencyMatrixByLabel = {};
	var mapping = {};

	function combineNodes2(){
		// console.log("begin combineNodes");
		var groupNodeToParentReturn = groupNodeToParent();
		var newNodeArrayFromGroup = groupNodeToParentReturn["newNodeArray"];
		var newConnectionInfoFromGroup = groupNodeToParentReturn["newConnectionInfo"];

		treeLevels = Object.keys(newNodeArrayFromGroup);
		var newNodeArray = {};//the final node array
		var newConnectionInfo = {};//the final connection info

		///// assigning id and create adjacency matrix////////////
		var idCounter = 0;
		treeLevels.forEach(function(treeLev){
			var specialIDAtLevelList = Object.keys( newNodeArrayFromGroup[treeLev] );
			specialIDAtLevelList.forEach(function(currentSpecialID){
				var sankeyNode = newNodeArrayFromGroup[treeLev][currentSpecialID];
				sankeyNode["sankeyID"] = idCounter;
				sankeyNode["oldSpecialID"] = sankeyNode["specialID"];
				var connectionInfo = newConnectionInfoFromGroup[treeLev][currentSpecialID];
				nodeList[idCounter] = sankeyNode;
				edgeList[idCounter] = connectionInfo;
				idCounter += 1;
			});
		});

		treeLevels.forEach(function(treeLev, idx){
			var currentTreeLevel = treeLev;
			if(idx > 0){
				var specialIDAtLevelList = Object.keys( newNodeArrayFromGroup[treeLev] );
				specialIDAtLevelList.forEach(function(currentSpecialID){
					var sankeyNode = newNodeArrayFromGroup[treeLev][currentSpecialID];
					var sankeyNodeID = sankeyNode["sankeyID"];
					adjacencyMatrix[sankeyNodeID] = [];

					var connectionInfoList = newConnectionInfoFromGroup[treeLev][currentSpecialID];
					var parentSpecialIDList = [];
					connectionInfoList.forEach(function(connInfo){
						var parentSpcID = connInfo["parentSpecialID"];
						if(parentSpecialIDList.indexOf(parentSpcID) == -1){
							parentSpecialIDList.push(parentSpcID);
						}
					});

					parentSpecialIDList.forEach(function(parentSpcID){

						for(var i = parseInt(currentTreeLevel) - 1; i >= 0; i--){
							var previousLev = i;
							var specialIDAtThisLevel = Object.keys(newNodeArrayFromGroup[previousLev]);
							if(specialIDAtThisLevel.indexOf(parentSpcID) > -1){
								var parSankeyID = newNodeArrayFromGroup[previousLev][parentSpcID]["sankeyID"];

								if(adjacencyMatrix[parSankeyID] != null){
									adjacencyMatrix[parSankeyID].push(sankeyNodeID);
								}
								else{
									console.log('something is wrong', parSankeyID, "currentSpecialID is", currentSpecialID )
								}

								break;
							}
						}

					});

				});
			}

			else{
				adjacencyMatrix[0] = [];
			}
		});
		/////// end of assigning id and create adjacency matrix
		// console.log("finish combineNodes");


		idList = Object.keys(adjacencyMatrix);
		idList.sort(function(a,b){
			return a - b;
		});

		idList.forEach(function(id){
			var node = nodeList[id];
			var label = node["specialID"];
			if(labelList[label] == null){
				labelList[label] = [];
			}
			labelList[label].push(parseInt(id));
		});


		var seenLabelBefore = [];
		var finalNodeList = {};

		idList.forEach(function(id){
			var connection = adjacencyMatrix[id];
			var node = nodeList[id];	
			var nodeLabel = node["specialID"];
			if(seenLabelBefore.indexOf(nodeLabel) == -1){
				finalNodeList[id] = node;
				adjacencyMatrixByLabel[nodeLabel] = [];
				seenLabelBefore.push(nodeLabel);
			}
			else{
				//change the label
				var availableLabels = Object.keys(labelList);
				availableLabels.forEach(function(lab){
					var ids = labelList[lab];

					if(ids.indexOf(parseInt(id)) >= 0){
						nodeLabel = lab;
					}

				});

				if(node["specialID"] == nodeLabel){

				}
				else{
					node["specialID"] = nodeLabel;
				}
			}

			connection.forEach(function(connID){
				var toLabel;
				var availableLabels = Object.keys(labelList);
				availableLabels.forEach(function(lab){
					// if(id==4){
					// 	console.log(labelList[lab], lab);
					// }
					var ids = labelList[lab];

					if(ids.indexOf(parseInt(parseInt(connID))) >= 0){
						toLabel = lab;
					}

				});

				addEdge(id, nodeLabel, connID, toLabel);

			})

		});		
	}


	function calcEdge(){
		combineNodes2();
		var sankIDCounter = 0;
		var name;
		var idMap = {};
		var finalNodes = {};
		var finalEdges = [];
		var finalEdgeList = {};

		var nodeIDConnectionList = {};

		var finalLabels = Object.keys(adjacencyMatrixByLabel);
		finalLabels.forEach(function(sourceLabel){
			var uniqueIDList = []; //this store the unigue node id taken from the tree node;
			var sankeyNodeList = []; //this list contains the sankey nodes that make up this final node
			var totalRuntime = 0;
			var sourceIDList = labelList[sourceLabel];
			var connectToLabelList = adjacencyMatrixByLabel[sourceLabel];
			var oldSpecialID;

			if(sourceIDList.length > 0){
				var tempID = sourceIDList[0];
				name = nodeList[tempID]["name"];
			}
			sourceIDList.forEach(function(sID){
				var sUniqueID = nodeList[sID]["uniqueID"];
				if(sankeyNodeList.indexOf(sID) == -1){
					sankeyNodeList.push(sID);
				}
				sUniqueID.forEach(function(id){
					if(uniqueIDList.indexOf(id) == -1){
						uniqueIDList.push(id);
					}
				});
			});
			connectToLabelList.forEach(function(connLabel){
				var connectToIDList = labelList[connLabel];
				//The problem probably lies in here
				//we are essesnsitally calculate connection by permutate on both list

				var runTimeVal = 0;
				var nodeIDUniqueList = [];
				var runTimeAvg = 0;
				// console.log(connLabel);
				connectToIDList.forEach(function(tID){
					sourceIDList.forEach(function(sID){
						
						// var sourceSpcID = nodeList[sID]["specialID"];
						var sourceSpcID = nodeList[sID]["oldSpecialID"];
						oldSpecialID = nodeList[sID]["oldSpecialID"];
						var connectionList = edgeList[tID];
						// var runTimeVal = 0;
						var ttemp = 0;



						connectionList.forEach(function(connInfo){

							if(//connInfo["parentSpecialID"] == sourceSpcID && 
								nodeList[sID]["uniqueID"].indexOf(connInfo["parentNodeID"]) > -1
								&& (connInfo["type"] == "PF" || connInfo["type"] == "PR")
								){

								var nodeID = connInfo["nodeID"];
								nodeIDUniqueList.push(nodeID);
								var sumOfRunTimeForThisNode = 0;
								var runTimeInc = nodeMetric[nodeID]["inc"];
								runTimeInc.forEach(function(val){
									runTimeVal += val;
									ttemp += val;
									sumOfRunTimeForThisNode += val;
								});

								runTimeAvg += sumOfRunTimeForThisNode / Math.max(runTimeInc.length, 1);
							}
						});// end of connectionList

					}) //end of sourceIDList
				}) // end of connectToID

				if(runTimeVal > rootRuntime * FILTERPERCENT * 1){
					// totalRuntime += runTimeVal;
					totalRuntime += runTimeAvg;
                    var tempEdge = {
                        // "value" : runTimeVal == 0 ? 1 : runTimeVal,
                        "value" : runTimeAvg == 0 ? 1 : runTimeAvg,
                        // "oldSourceSpcID" : sourceSpcID,
                        // "oldTargetSpcID" : nodeList[tID]["oldSpecialID"],
                        // "sourceSpcID" : nodeList[sID]["specialID"],
                        // "targetSpcID" : nodeList[tID]["specialID"]
                        "sourceSpcID" : sourceLabel,
                        "targetSpcID" : connLabel
                    }
                    // fs.appendFileSync("edgeInfo", JSON.stringify(tempEdge) + "\n");		
                    var tSourceSpcID = sourceLabel;
                    var tTargetSpcID = connLabel;
                    if(finalEdgeList[ tSourceSpcID ] == null){
                    	finalEdgeList[ tSourceSpcID ] = {};
                    	nodeIDConnectionList[ tSourceSpcID ] = {};
                    }	
                    if(  finalEdgeList[ tSourceSpcID ][ tTargetSpcID ]== null){
                    	finalEdgeList[ tSourceSpcID ][ tTargetSpcID ] = 0;
                    	nodeIDConnectionList[ tSourceSpcID ][ tTargetSpcID ] = [];
                    }	
                    finalEdgeList[ tSourceSpcID ][ tTargetSpcID ] += tempEdge["value"];
                    nodeIDUniqueList.forEach(function(nodeID){
                    	nodeIDConnectionList[ tSourceSpcID ][ tTargetSpcID ].push(nodeID);
                    })

				}				
			}); //end of connectToLabelList

			finalNodes[sourceLabel] = {
				"sankeyID" : sankIDCounter,
				"name" : name ,
				"specialID" : sourceLabel,
				"runTime" : totalRuntime,
				"oldSpecialID" : oldSpecialID,
				"uniqueNodeID" : uniqueIDList,
				"sankeyNodeList" : sankeyNodeList
			};

			idMap[sourceLabel] = sankIDCounter;
			sankIDCounter += 1;

		}); //end of finalLabels

		var finalEdgeLabelList = Object.keys(finalEdgeList);
		finalEdgeLabelList.forEach(function(fromLabel){
			var connectToLab = Object.keys(finalEdgeList[fromLabel]);
			connectToLab.forEach(function(target){
				var temp = {
					"source" : idMap[fromLabel],
					"target" : idMap[target],
					"sourceID" : idMap[fromLabel],
					"targetID" : idMap[target],
					"sourceLabel" : fromLabel,
					"targetLabel" : target,
					"value" : finalEdgeList[fromLabel][target],
					"nodeIDList" : []
				}
				// fs.appendFileSync("edgeInfo", JSON.stringify(temp) + "\n");
				var uniqueIDListNode = nodeIDConnectionList[ fromLabel ][ target ];
				var tmpList = [];
				uniqueIDListNode.forEach(function(nID){
					if(tmpList.indexOf(nID) == -1){
						tmpList.push(nID);
					}
				});
				temp["nodeIDList"] = tmpList;
				finalEdges.push(temp);
			})
		});

		return {"nodes" : finalNodes, "edges" : finalEdges, "nodeList" : nodeList, "edgeList" : edgeList};
	}

	function addEdge(fromID, fromLabel, toID, toLabel){
		var canReach = isReachable(toLabel, fromLabel);

		if(canReach){

			//check for other mapping
			if(mapping[toLabel] == null){ //we never got this mapping before so create a new one
				mapping[toLabel] = [];
				var newLabel = toLabel + "_" + mapping[toLabel].length;
				mapping[toLabel].push(newLabel);
				// adjacencyMatrixByLabel[fromLabel].push(newLabel);
				if(adjacencyMatrixByLabel[fromLabel].indexOf(newLabel) == -1){
					adjacencyMatrixByLabel[fromLabel].push(newLabel);
				}					
				adjacencyMatrixByLabel[newLabel] = [];

				var oldIndexInLabelList = labelList[toLabel].indexOf(parseInt(toID));
				if(oldIndexInLabelList > -1){
					labelList[toLabel].splice(oldIndexInLabelList, 1);
				}

				labelList[newLabel] = [];
				labelList[newLabel].push(parseInt(toID));
				if(nodeList[toID]["specialID"] == toLabel){
					nodeList[toID]["specialID"] = newLabel;
				}
			}
			else{
				var map = mapping[toLabel];
				var needToCreateNewMapBool = true;
				var newLabel;

				map.forEach(function(mapToTry){
					needToCreateNewMapBool = isReachable(mapToTry, fromLabel);
					if(needToCreateNewMapBool == false){
						newLabel = mapToTry;
						return;
					}
				});

				if(needToCreateNewMapBool){
					// console.log("we need to create new label");
					newLabel = toLabel + "_" + mapping[toLabel].length;
					var oldIndexInLabelList = labelList[toLabel].indexOf(parseInt(toID));
					if(oldIndexInLabelList > -1){
						labelList[toLabel].splice(oldIndexInLabelList, 1);
					}
					labelList[newLabel] = [];
					labelList[newLabel].push(parseInt(toID));
					// adjacencyMatrixByLabel[fromLabel].push(newLabel);
					if(adjacencyMatrixByLabel[fromLabel].indexOf(newLabel) == -1){
						adjacencyMatrixByLabel[fromLabel].push(newLabel);
					}						
					adjacencyMatrixByLabel[newLabel] = [];

				}
				else{
					var oldIndexInLabelList = labelList[toLabel].indexOf(parseInt(toID));
					if(oldIndexInLabelList > -1){
			
						labelList[toLabel].splice(oldIndexInLabelList, 1);
					
					}
					labelList[newLabel].push(parseInt(toID));
					if(nodeList[toID]["specialID"] == toLabel){
						nodeList[toID]["specialID"] = newLabel;
					}	

					// adjacencyMatrixByLabel[fromLabel].push(newLabel);
					if(adjacencyMatrixByLabel[fromLabel].indexOf(newLabel) == -1){
						adjacencyMatrixByLabel[fromLabel].push(newLabel);
					}					
					if(adjacencyMatrixByLabel[newLabel] == null){
						adjacencyMatrixByLabel[newLabel] = [];
					}

				}
			}
		}
		else{

			if(fromLabel != toLabel){
				if(adjacencyMatrixByLabel[fromLabel].indexOf(toLabel) == -1){
					adjacencyMatrixByLabel[fromLabel].push(toLabel);
				}
			}
			if(adjacencyMatrixByLabel[toLabel] == null){
				adjacencyMatrixByLabel[toLabel] = [];
			}
		}

	}

	function isReachable(sourceLabel, toLabel){
		var visited = {};
		Object.keys(adjacencyMatrixByLabel).forEach(function(nLabel){
			visited[nLabel] = {"visited" : false};
		});

		if(visited[sourceLabel] != null && sourceLabel != toLabel){
			var queue = [];
			queue.unshift(sourceLabel); //add to front
			visited[sourceLabel]["visited"] = true;

			while(queue.length > 0){
				var n = queue.shift();

				if(n == toLabel){
					return true;
				}
				else{
					var tLabelList = [];
					adjacencyMatrixByLabel[n].forEach(function(t){
						tLabelList.push(t);
					});

					tLabelList.forEach(function(tLabel){
						if(visited[tLabel] != null){
							if(visited[tLabel]["visited"] == false){
								queue.unshift(tLabel);
								visited[tLabel]["visited"] = true;
							}
						}
					})
				}
			}
		}

		return false;
	}

	function calculateEdge(specialIDofCurrentNode , connectionList, needToReLable, newLabel){

		if(needToReLable){
			specialIDofCurrentNode = newLabel;
		}

		 // connInfo
		 var connInfoByChild = {};
		 connectionList.forEach(function(connInfo){
		 	var childSpecID = connInfo["childSpecialID"];
		 	if(needToReLable){
		 		connInfo["specialID"] = newLabel;
		 	}

		 	var parSpcID = connInfo["parentSpecialID"];
		 	if(parentChildrenList[connInfo["specialID"]]["parent"].indexOf(parSpcID) == -1){
		 		parentChildrenList[connInfo["specialID"]]["parent"].push(parSpcID);
		 	}

		 	if(connInfoByChild[childSpecID] == null){
		 		connInfoByChild[childSpecID] = [];
		 	}

		 	connInfoByChild[childSpecID].push(connInfo);

		 }); //end of connectionList

		 var chldSpecIDList = Object.keys(connInfoByChild);
		 chldSpecIDList.forEach(function(childSpecID){

		 	//get connection info for this child
		 	var chldConnList = connInfoByChild[childSpecID];

		 	var formCyleBool = false;

		 	var chldRunTime = 0;

		 	var numberOfProcess = 1;

		 	chldConnList.forEach(function(chldConn){
		 		var chldNodeID = chldConn["childID"];
		 		var chldNodeRunTimeInc = nodeMetric[chldNodeID]['inc'];
		 		// numberOfProcess = Math.max(numberOfProcess, chldNodeRunTimeInc.length);
		 		chldNodeRunTimeInc.forEach(function(val){
		 			chldRunTime += val;
		 		}); // end of chldNodeRunTimeInc;

		 		//this will allow us to know wheter or not this specific chldid will form a cycle
		 		var nodeID = chldConn["nodeID"];
		 		var chldPath = nodePaths[chldNodeID];
		 		var nodePath = nodePaths[nodeID];
		 		if(chldPath.includes(nodePath)){
                        formCyleBool = true;
                }

		 	}); //end of chldConnList

		 	//now we have the value, we need to check if we want to keep it
		 	if(chldRunTime >= rootRuntime * FILTERPERCENT){

		 		if(formCyleBool){ //connect to this child will create a cycle
		 			if(newLMIDMapping[childSpecID] == null){
		 				newLMIDMapping[childSpecID] = [];
		 			}

		 			var newLabelName;

		 			if(newLMIDMapping[childSpecID] == null){
		 				newLMIDMapping[childSpecID] = [];
		 			}
		 			if(newConnectionMap[specialIDofCurrentNode] == null && newLMIDMapping[childSpecID] != null && newLMIDMapping[childSpecID].length > 0){
		 				newLabelName = newLMIDMapping[childSpecID][ newLMIDMapping[childSpecID].length ];
		 			}
		 			else{
		 				newLabelName = childSpecID + "_" + newLMIDMapping[childSpecID].length;
		 				newLMIDMapping[childSpecID].push(newLabelName);
		 			}

		 			if(newConnectionMap[specialIDofCurrentNode] == null){
		 				newConnectionMap[specialIDofCurrentNode] = [];
		 			}
		 			newConnectionMap[specialIDofCurrentNode].push({"oldChildSpecialID" : childSpecID, "newChildSpecialID" : newLabelName});

		 			var tempEdge = {
                        "value" : chldRunTime == 0 ? 1 : chldRunTime / numberOfProcess,
                        "sourceSpcID" : specialIDofCurrentNode,
                        "targetSpcID" : newLabelName		 				
		 			};

		 			fs.appendFileSync("splitMiranda.json", JSON.stringify(tempEdge) + "\n");

		 		}
		 		else{
		 			var tempEdge = {
                        "value" : chldRunTime == 0 ? 1 : chldRunTime / numberOfProcess,
                        "sourceSpcID" : specialIDofCurrentNode,
                        "targetSpcID" : childSpecID		 				
		 			};		

		 			fs.appendFileSync("splitMiranda.json", JSON.stringify(tempEdge) + "\n");
		 		}
		 	}

		 }); // end of chldSpecIDList
	}

	function detectCycle(specialID, specialIDToCheck){

	}

	this.compute = function(){
		var res = calcEdge();
		return {"newSankey" : res};
	}
}

module.exports = LMCalc;