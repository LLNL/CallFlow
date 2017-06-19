var graphBuilder = function(nodeArray, connectionInfo, nodeInfo, nodeMetric){

	var orgAdjMatrix = {};
	var nodeIDtoLM = {}; //keep the mapping from node id of orgAdjMat to lm

	var rootLMID = 0;

	var map = {};
	var nodeList = {};

	var lmAdjMatrix = {};

	var maxLMID = 0;
	var idList = [];

	var sankeyNodeList = {};

	var nameList = {};

	//these two hold the relavent information reguarding the 
	var finalSankeyNodes = {};
	var finalSankeyEdges = {};

	var FILTERPERCENT = 1 / 100;

	function computeTime(){
		// console.log('begin computing runtime for each sankey node');
		var treeLevels = Object.keys(nodeArray);
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

		rootRuntime = nodeArray[0][rootLMID]["incTime"];
		// console.log(rootRuntime);
		var nodesKeepAfterFilter = {};
		var notInterestSpecID = {};
		var treeLevels = Object.keys(nodeArray);
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

	                notInterestSpecID[treeLev].push(parseInt(lmAtLevel));
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
		                notInt.push(parseInt(ni));
		                // notInt.push(ni);
		            });
		        }

		        // if(idx == 35){
		        // 	console.log(notInt, spcIDAtThisLevel);
		        // }

		        spcIDAtThisLevel.forEach(function(currentSpcID){
		        	var tempParentLMID = nodesKeepAfterFilter[treeLev][currentSpcID]["parentLMID"];

		        	var tParentLMID = [];
		        	tempParentLMID.forEach(function(id){
		        		tParentLMID.push(parseInt(id));
		        	})

		            notInt.forEach(function(nLMID){
		            	var nLMIDINT; //= parseInt(nLMID.replace('LM', ''));
		            	nLMIDINT = parseInt(nLMID);
		                var tempIDX = tParentLMID.indexOf(nLMIDINT);

		                // if(idx == 35 && nLMIDINT == 7152 && parseInt(currentSpcID) == 7156){
	                	// if(idx == 35 ){
		                // 	console.log(tempIDX, tParentLMID, currentSpcID)
		                // }

		                if(tempIDX >= 0){
		                    tempParentLMID.splice(tempIDX, 1);
		                }
		                
		            });

		             nodesKeepAfterFilter[treeLev][currentSpcID]["parentLMID"] = tempParentLMID;

		        })

			}		
		}); // end of treeLevels

		// console.log('finish with filtering nodes');
		// console.log(notInterestSpecID);
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
		
					var mySpecialID = nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel]["loadModID"];

	                //taking care of the easy case first, which has more than one parents
	                if(nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel]["parentLMID"].length > 1){


	                    var canMergeBool = false;
	                    var parentSameAsMeLevel;
	                    tparentsLMID = [];
	                    nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel]["parentLMID"].forEach(function(val){
	                    	tparentsLMID.push( parseInt(val) );
	                    })

	                    if(tparentsLMID.indexOf(parseInt(currentLMAtLevel)) > -1){
	                    	//so one of my parentLMID is the same as me
	                    	var otherParentLevel = [];
	                    	
	                    	var parentsList = nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel]["parentLMID"];
	                    	parentsList.forEach(function(parSpcID){
		                    	for(var tIndex = parseInt(currentTreeLev) - 1; tIndex >= 0; tIndex--){
		                    		var spcIDAtThisLevel = Object.keys(newNodeArray[tIndex]);

		                    		var tspcIDAtThisLevel = [];
		                    		spcIDAtThisLevel.forEach(function(val){
		                    			tspcIDAtThisLevel.push(parseInt(val));
		                    		})

		                    		if(tspcIDAtThisLevel.indexOf(parseInt(parSpcID)) > -1){
		                    			if(parseInt(parSpcID) == parseInt(currentLMAtLevel)){
		                    				parentSameAsMeLevel = tIndex;
		                    			}
		                    			else{
		                    				if(otherParentLevel.indexOf(parseInt(parSpcID)) == -1){
		                    					otherParentLevel.push(parseInt(tIndex));
		                    				}
		                    			}
		                    			break;
		                    		}
		                    	}
	                    	}); // end of parentsList

	                    	if(otherParentLevel.indexOf(parseInt(parentSameAsMeLevel)) == -1 && typeof(parentSameAsMeLevel) != 'undefined'){
	                    		var largestBool = true;
	                    		otherParentLevel.forEach(function(lev){
	                    			if(parseInt(lev) >= parseInt(parentSameAsMeLevel)){
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
                            	// if(parseInt(connInfo["loadModID"]) != parseInt(connInfo["parentLMID"])){
	                                newConnectionInfo[parentSameAsMeLevel][currentLMAtLevel].push(connInfo);
                            	// }
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
	                else if( nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel]["parentLMID"].length == 1 &&
	                		 parseInt(nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel]["parentLMID"][0]) != parseInt(currentLMAtLevel)){
	                	newNodeArray[currentTreeLev][currentLMAtLevel] = nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel];
	                    newConnectionInfo[currentTreeLev][currentLMAtLevel] = connectionInfo[currentTreeLev][currentLMAtLevel];
	                }

	                //if only have one parent and parent lmid is same as current node lmid
	                else if(nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel]["parentLMID"].length == 1 &&
	                		 parseInt(nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel]["parentLMID"][0]) == parseInt(currentLMAtLevel)){
	                	//look for the node with same lm from previous level
	                	for(var i = currentTreeLev -1; i >= 0; i--){
	                		var previousLevel = i;

	                        var prevLevelLM = Object.keys(newNodeArray[previousLevel]);

	                        var tPrevLevelLM = [];
	                        prevLevelLM.forEach(function(val){
	                        	tPrevLevelLM.push( parseInt(val) );
	                        })

	                        //check if this prev level has the LM we want
	                        if(tPrevLevelLM.indexOf(parseInt(currentLMAtLevel)) > -1){

		                    	var currentConnectionInfo = connectionInfo[currentTreeLev][currentLMAtLevel];
	                            currentConnectionInfo.forEach(function(connInfo){
	                            	// if(parseInt(connInfo["loadModID"]) != parseInt(connInfo["parentLMID"])){
		                                newConnectionInfo[previousLevel][currentLMAtLevel].push(connInfo);
	                            	// }
		                        });

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
		// console.log(newNodeArray);
		// console.log(newNodeArray[28][7152]['parentLMID']);
		return {"newNodeArray" : newNodeArray, "newConnectionInfo" : newConnectionInfo};
	}

	var labelList = {};
	var nodeList = {};
	var edgeList = {};

	var adjacencyMatrix = {};
	var idList = []
	var adjacencyMatrixByLabel = {};
	var mapping = {};

	function combineNodes(){
		console.log("begin combineNodes");
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
				var connectionInfo = newConnectionInfoFromGroup[treeLev][currentSpecialID];
				nodeList[idCounter] = sankeyNode;
				edgeList[idCounter] = connectionInfo;
				maxLMID = Math.max(parseInt(currentSpecialID), maxLMID);
				idCounter += 1;
			});
		});

		// console.log("after assigning id", idCounter);

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
						var parentLMID = connInfo["parentLoadModID"];
						if(parentSpecialIDList.indexOf(parentLMID) == -1){
							parentSpecialIDList.push(parseInt(parentLMID));
						}
					});

					parentSpecialIDList.forEach(function(parentLMID){

						for(var i = parseInt(currentTreeLevel) - 1; i >= 0; i--){
							var previousLev = i;
							var specialIDAtThisLevel = Object.keys(newNodeArrayFromGroup[previousLev]);
							var loadModAtLevel = [];
							specialIDAtThisLevel.forEach(function(lm){
								loadModAtLevel.push(parseInt(lm));
							})

							if(loadModAtLevel.indexOf(parentLMID) > -1){
								var parSankeyID = newNodeArrayFromGroup[previousLev][parentLMID]["sankeyID"];

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

		idList = Object.keys(adjacencyMatrix);
		idList.sort(function(a,b){
			return a - b;
		});

		idList.forEach(function(id){
			var node = nodeList[id];
			var label = parseInt(node["loadModID"]);
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
			var nodeLabel = parseInt(node["loadModID"]);
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

				if(node["loadModID"] == nodeLabel){

				}
				else{
					node["loadModID"] = nodeLabel;
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

		// console.log(adjacencyMatrixByLabel);

		Object.keys(labelList).forEach(function(lab){
			var tid = labelList[lab][0];
			var tnode = nodeList[tid];
			// console.log(tnode["name"], lab);

			finalSankeyNodes[lab] = {
				"loadModID" : lab,
				"name" : tnode["name"],
				"uniqueIDList" : []
			}

			finalSankeyEdges[lab] = [];

			labelList[lab].forEach(function(nID){
				var node = nodeList[nID];
				var uniqueIDList = node["uniqueID"];
				uniqueIDList.forEach(function(uniqueID){
					finalSankeyNodes[lab]["uniqueIDList"].push(uniqueID);
					nodeInfo[uniqueID]["loadModID"] = lab;
				})

				var edges = edgeList[nID];
				edges.forEach(function(edge){
					finalSankeyEdges[lab].push(edge);
				})
			})
		})

	}

	function calcEdge(){
		combineNodes();
		var sankIDCounter = 0;
		var name;
		var idMap = {};
		var finalNodes = {};
		var finalEdges = [];
		var finalEdgeList = {};
		var nodeIDConnectionList = {};
		var finalConnectionInfo = {};

		var removeConns = {};
		var removeNodeID = [];

		var finalLabels = Object.keys(adjacencyMatrixByLabel);
		finalLabels.forEach(function(sourceLabel){
			var uniqueIDList = []; //this store the unigue node id taken from the tree node;
			var sankeyNodeList = []; //this list contains the sankey nodes that make up this final node		
			var totalRuntime = 0;
			var rawRunTime = 0;
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
				var runTimeVal = 0;
				var nodeIDUniqueList = [];
				var runTimeAvg = 0;

				connectToIDList.forEach(function(tIDtemp){
					var tID = parseInt(tIDtemp);
					sourceIDList.forEach(function(sIDtemp){
						var sID = parseInt(sIDtemp);

						var connectionList = edgeList[tID];
						var ttemp = 0;
						connectionList.forEach(function(connInfo){



							if( nodeList[sID]["uniqueID"].indexOf(connInfo["parentNodeID"]) > -1
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
				}) //end of connectToIDList

				//filter out all small edges
				if(runTimeVal > rootRuntime * FILTERPERCENT * 1){
					if(sourceLabel == '7159'){
						console.log(connLabel);
					}
					// totalRuntime += runTimeVal;
					totalRuntime += runTimeAvg;
					rawRunTime += runTimeVal;
                    var tempEdge = {
                        // "value" : runTimeVal == 0 ? 1 : runTimeVal,
                        "value" : runTimeAvg == 0 ? 1 : runTimeAvg,
                        "sourceLoadModID" : sourceLabel,
                        "targetLoadModID" : connLabel
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

				else{
					if(removeConns[sourceLabel] == null){
						removeConns[sourceLabel] = [];
					}
					removeConns[sourceLabel].push(connLabel);
					// if(sourceLabel == "5649" && connLabel == "7091"){
					// 	console.log(nodeIDUniqueList);
					// }
					nodeIDUniqueList.forEach(function(nID){
						if(removeNodeID.indexOf(nID) == -1){
							removeNodeID.push(nID);
						}
					})
					
				}

			})	//end of connectToLabelList

			finalNodes[sourceLabel] = {
				"sankeyID" : sankIDCounter,
				"name" : name ,
				"specialID" : sourceLabel,
				"runTime" : totalRuntime,
				"rawRunTime" : rawRunTime,
				"oldSpecialID" : oldSpecialID,
				"uniqueNodeID" : uniqueIDList,
				"sankeyNodeList" : sankeyNodeList
			};

			console.log("the node", sourceLabel, uniqueIDList.length);

			var connections = [];
			sankeyNodeList.forEach(function(id){
				var conns = edgeList[id];
				conns.forEach(function(conn){
					conn["parentLoadModID"] = nodeInfo[ conn["parentNodeID"] ]["loadModID"];
					conn["loadModID"] = nodeInfo[ conn["nodeID"] ]["loadModID"];


					// if(conn["value"] > rootRuntime * FILTERPERCENT * 1){
						// connections.push(conn);
					// }

					if(conn["loadModID"] == "7091" && conn["parentLoadModID"] == "5649"){
						// console.log();
					}

					if(removeNodeID.indexOf(conn["nodeID"]) == -1){
						connections.push(conn);
						if(conn["loadModID"] == "7091" && conn["parentLoadModID"] == "5579"){
							// console.log('I was not remove');
						}						
					}
					else{
						if(conn["loadModID"] == "7091" && conn["parentLoadModID"] == "5579"){
							// console.log('I was remove');
						}
					}
				})
			})

			finalConnectionInfo[sourceLabel] = connections;

			idMap[sourceLabel] = sankIDCounter;
			sankIDCounter += 1;			

			var removedLables = removeConns[sourceLabel];
			if(removedLables != null){
				removedLables.forEach(function(lab){
					var removeIndex = adjacencyMatrixByLabel[sourceLabel].indexOf(lab.toString());
					if(removeIndex > -1){
						adjacencyMatrixByLabel[sourceLabel].splice(removeIndex, 1);
					}
				});
			}

		})	//end of finalLabels	

		// console.log(idMap);

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



		console.log(adjacencyMatrixByLabel);
		console.log(rootRuntime);
		// console.log(removeNodeID)
		return {"nodes" : finalNodes, "edges" : finalEdges, "nodeList" : nodeList, "edgeList" : edgeList, "connInfo" : finalConnectionInfo, "adjMatrix" : adjacencyMatrixByLabel};		

	}

	function addEdge(fromID, fromLabel, toID, toLabel){
		var canReach = isReachable(toLabel, fromLabel);

		if(canReach){

			//check for other mapping
			if(mapping[toLabel] == null){ //we never got this mapping before so create a new one
				mapping[toLabel] = [];
				maxLMID += 1;
				var newLabel = maxLMID;
				mapping[toLabel].push(newLabel);
				
				var labelsOfadjacencyMatrixByLabel = [];
				adjacencyMatrixByLabel[fromLabel].forEach(function(lb){
					labelsOfadjacencyMatrixByLabel.push( parseInt(lb) );
				})

				if(labelsOfadjacencyMatrixByLabel.indexOf(newLabel) == -1){
					adjacencyMatrixByLabel[fromLabel].push(newLabel);
				}					
				adjacencyMatrixByLabel[newLabel] = [];

				var oldIndexInLabelList = labelList[parseInt(toLabel)].indexOf(parseInt(toID));
				if(oldIndexInLabelList > -1){
					labelList[parseInt(toLabel)].splice(oldIndexInLabelList, 1);
				}

				labelList[parseInt(newLabel)] = [];
				labelList[parseInt(newLabel)].push(parseInt(toID));
				if(parseInt(nodeList[toID]["loadModID"]) == parseInt(toLabel)){
					nodeList[toID]["loadModID"] = newLabel;
				}
			}
			else{
				var map = mapping[toLabel];
				var needToCreateNewMapBool = true;
				var newLabel;

				map.some(function(mapToTry){
					needToCreateNewMapBool = isReachable(mapToTry, fromLabel);
					if(needToCreateNewMapBool == false){
						newLabel = mapToTry;
						return true;
					}
				});

				if(needToCreateNewMapBool){
					// console.log("we need to create new label");
					maxLMID += 1;
					newLabel = maxLMID;
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
					labelList[parseInt(newLabel)].push(parseInt(toID));
					if(parseInt(nodeList[toID]["loadModID"]) == parseInt(toLabel)){
						nodeList[toID]["loadModID"] = newLabel;
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

	this.compute = function(){
		var res = calcEdge();
		return {"newSankey" : res};
		// combineNodes()
		// groupNodeToParent();
	}
}
module.exports = graphBuilder;