/** *****************************************************************************
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
 ***************************************************************************** */

const graphBuilder = function (nodeArray, connectionInfo, nodeInfo, nodeMetric) {
    const orgAdjMatrix = {};
    const nodeIDtoLM = {}; // keep the mapping from node id of orgAdjMat to lm

    const rootLMID = 0;

    const map = {};
    var nodeList = {};

    const lmAdjMatrix = {};

    let maxLMID = 0;
    var idList = [];

    const sankeyNodeList = {};

    const nameList = {};

    // these two hold the relavent information reguarding the
    const finalSankeyNodes = {};
    const finalSankeyEdges = {};

    const FILTERPERCENT = 1 / 100;

    function computeTime() {
        // console.log('begin computing runtime for each sankey node');
        const treeLevels = Object.keys(nodeArray);
        treeLevels.forEach((treeLev) => {
            const lmAtLevelList = Object.keys(nodeArray[treeLev]);

            lmAtLevelList.forEach((lmAtLevel) => {
                const sankeyNode = nodeArray[treeLev][lmAtLevel];
                const nodeIDList = sankeyNode.uniqueID;

	            let sumInc = 0;
	            let sumExc = 0;
	            const maxInc = 0;
	            const maxExc = 0;
	            const count = 0;
	            let incRunTimeArray;
	            let excRunTimeArray;
                nodeIDList.forEach((nodeID, idx) => {
	                const tempInc = nodeMetric[nodeID].inc;
	                const tempExc = nodeMetric[nodeID].exc;

	                let mySumInc = 0;
	                let mySumExc = 0;
	                if (idx == 0) {
	                	incRunTimeArray = tempInc;
	                	excRunTimeArray = tempExc;
	                } else {
	                	incRunTimeArray = incRunTimeArray.SumArray(tempInc);
	                	excRunTimeArray = excRunTimeArray.SumArray(tempExc);
	                }
	                tempInc.forEach((val) => {
	                    mySumInc += val;
	                });

	                tempExc.forEach((val) => {
	                    mySumExc += val;
	                });

	                sumInc += mySumInc;
	                sumExc += mySumExc;
                }); // end nodeIDList
                nodeArray[treeLev][lmAtLevel].incTime = sumInc;
	            nodeArray[treeLev][lmAtLevel].excTime = sumExc;

	            nameList[lmAtLevelList] = nodeArray[treeLev][lmAtLevel].name;
            }); // end lmAtLevelList
        }); // end treeLevels
        // console.log("finish with computing runtime for each sankey node");
    }

    function filterNodes() {
        computeTime();
        // console.log('begin filtering nodes');

        rootRuntime = nodeArray[0][rootLMID].incTime;
        // console.log(rootRuntime);
        const nodesKeepAfterFilter = {};
        const notInterestSpecID = {};
        const treeLevels = Object.keys(nodeArray);
        treeLevels.forEach((treeLev) => {
            // filterNodeData[treeLev] = {};
            nodesKeepAfterFilter[treeLev] = {};
            const lmAtLevelList = Object.keys(nodeArray[treeLev]);
            lmAtLevelList.forEach((lmAtLevel) => {
                const sankeyNode = nodeArray[treeLev][lmAtLevel];
                if (sankeyNode.incTime >= (FILTERPERCENT * rootRuntime)) {
                    nodesKeepAfterFilter[treeLev][lmAtLevel] = sankeyNode;
                } else {
	                if (notInterestSpecID[treeLev] == null) {
	                    notInterestSpecID[treeLev] = [];
	                }

	                notInterestSpecID[treeLev].push(parseInt(lmAtLevel));
	            }
            }); // end of lmAtLevelList
        }); // end of treeLevels

        treeLevels.forEach((treeLev, idx) => {
            if (idx > 0) {
                const spcIDAtThisLevel = Object.keys(nodesKeepAfterFilter[treeLev]);
                const notInsSpcTemp = notInterestSpecID[treeLev - 1];
		        const notInt = [];
		        if (typeof notInsSpcTemp !== 'undefined') {
		            notInsSpcTemp.forEach((ni) => {
		                notInt.push(parseInt(ni));
		                // notInt.push(ni);
		            });
		        }

		        // if(idx == 35){
		        // 	console.log(notInt, spcIDAtThisLevel);
		        // }

		        spcIDAtThisLevel.forEach((currentSpcID) => {
		        	const tempParentLMID = nodesKeepAfterFilter[treeLev][currentSpcID].parentLMID;

		        	const tParentLMID = [];
		        	tempParentLMID.forEach((id) => {
		        		tParentLMID.push(parseInt(id));
		        	});

		            notInt.forEach((nLMID) => {
		            	let nLMIDINT; //= parseInt(nLMID.replace('LM', ''));
		            	nLMIDINT = parseInt(nLMID);
		                const tempIDX = tParentLMID.indexOf(nLMIDINT);

		                // if(idx == 35 && nLMIDINT == 7152 && parseInt(currentSpcID) == 7156){
	                	// if(idx == 35 ){
		                // 	console.log(tempIDX, tParentLMID, currentSpcID)
		                // }

		                if (tempIDX >= 0) {
		                    tempParentLMID.splice(tempIDX, 1);
		                }
		            });

		             nodesKeepAfterFilter[treeLev][currentSpcID].parentLMID = tempParentLMID;
		        });
            }
        }); // end of treeLevels

        // console.log('finish with filtering nodes');
        // console.log(notInterestSpecID);
        return { nodesKeepAfterFilter };
    }

    // this function group two node together if the following conditions hold
    // parent and child have the same lm
    // child only have one parent
    function groupNodeToParent() {
        const filterNodesReturn = filterNodes();
        const nodesKeepAfterFilter = filterNodesReturn.nodesKeepAfterFilter;
        // console.log("begin groupNodeToParent");
        const newNodeArray = {};
        const newConnectionInfo = {};
        newNodeArray[0] = nodesKeepAfterFilter[0];
	    newConnectionInfo[0] = connectionInfo[0];
        const treeLevels = Object.keys(nodesKeepAfterFilter);

        treeLevels.forEach((treeLev, idx) => {
            if (idx > 0) { // skip root
                newNodeArray[treeLev] = {};
                newConnectionInfo[treeLev] = {};
                const lmAtLevelList = Object.keys(nodesKeepAfterFilter[treeLev]);
                const currentTreeLev = treeLev;
                lmAtLevelList.forEach((currentLMAtLevel) => {
                    const mySpecialID = nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel].loadModID;

	                // taking care of the easy case first, which has more than one parents
	                if (nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel].parentLMID.length > 1) {
	                    let canMergeBool = false;
	                    let parentSameAsMeLevel;
	                    tparentsLMID = [];
	                    nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel].parentLMID.forEach((val) => {
	                    	tparentsLMID.push(parseInt(val));
	                    });

	                    if (tparentsLMID.indexOf(parseInt(currentLMAtLevel)) > -1) {
	                    	// so one of my parentLMID is the same as me
	                    	const otherParentLevel = [];

	                    	const parentsList = nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel].parentLMID;
	                    	parentsList.forEach((parSpcID) => {
		                    	for (let tIndex = parseInt(currentTreeLev) - 1; tIndex >= 0; tIndex--) {
		                    		const spcIDAtThisLevel = Object.keys(newNodeArray[tIndex]);

		                    		var tspcIDAtThisLevel = [];
		                    		spcIDAtThisLevel.forEach((val) => {
		                    			tspcIDAtThisLevel.push(parseInt(val));
		                    		});

		                    		if (tspcIDAtThisLevel.indexOf(parseInt(parSpcID)) > -1) {
		                    			if (parseInt(parSpcID) == parseInt(currentLMAtLevel)) {
		                    				parentSameAsMeLevel = tIndex;
		                    			} else if (otherParentLevel.indexOf(parseInt(parSpcID)) == -1) {
		                    					otherParentLevel.push(parseInt(tIndex));
		                    				}
		                    			break;
		                    		}
		                    	}
	                    	}); // end of parentsList

	                    	if (otherParentLevel.indexOf(parseInt(parentSameAsMeLevel)) == -1 && typeof (parentSameAsMeLevel) !== 'undefined') {
	                    		let largestBool = true;
	                    		otherParentLevel.forEach((lev) => {
	                    			if (parseInt(lev) >= parseInt(parentSameAsMeLevel)) {
	                    				largestBool = false;
	                    			}
	                    		});
	                    		canMergeBool = largestBool;
	                    	} else {
	                    		canMergeBool = false;
	                    	}
	                    }

	                    if (canMergeBool) {
	                    	var currentConnectionInfo = connectionInfo[currentTreeLev][currentLMAtLevel];
                            currentConnectionInfo.forEach((connInfo) => {
                            	// if(parseInt(connInfo["loadModID"]) != parseInt(connInfo["parentLMID"])){
	                                newConnectionInfo[parentSameAsMeLevel][currentLMAtLevel].push(connInfo);
                            	// }
	                        });

                            var currentNode = nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel];
                            currentNode.uniqueID.forEach((nodeID) => {
                            	newNodeArray[parentSameAsMeLevel][currentLMAtLevel].uniqueID.push(nodeID);
                            });
	                    } else {
	                    	newNodeArray[currentTreeLev][currentLMAtLevel] = nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel];
	                    	newConnectionInfo[currentTreeLev][currentLMAtLevel] = connectionInfo[currentTreeLev][currentLMAtLevel];
	                    }
	                }

	                // if only have one parent, but parent lmid is not the same as current node lmid
	                else if (nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel].parentLMID.length == 1 &&
	                		 parseInt(nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel].parentLMID[0]) != parseInt(currentLMAtLevel)) {
	                	newNodeArray[currentTreeLev][currentLMAtLevel] = nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel];
	                    newConnectionInfo[currentTreeLev][currentLMAtLevel] = connectionInfo[currentTreeLev][currentLMAtLevel];
	                }

	                // if only have one parent and parent lmid is same as current node lmid
	                else if (nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel].parentLMID.length == 1 &&
	                		 parseInt(nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel].parentLMID[0]) == parseInt(currentLMAtLevel)) {
	                	// look for the node with same lm from previous level
	                	for (let i = currentTreeLev - 1; i >= 0; i--) {
	                		var previousLevel = i;

	                        const prevLevelLM = Object.keys(newNodeArray[previousLevel]);

	                        var tPrevLevelLM = [];
	                        prevLevelLM.forEach((val) => {
	                        	tPrevLevelLM.push(parseInt(val));
	                        });

	                        // check if this prev level has the LM we want
	                        if (tPrevLevelLM.indexOf(parseInt(currentLMAtLevel)) > -1) {
		                    	var currentConnectionInfo = connectionInfo[currentTreeLev][currentLMAtLevel];
	                            currentConnectionInfo.forEach((connInfo) => {
	                            	// if(parseInt(connInfo["loadModID"]) != parseInt(connInfo["parentLMID"])){
		                                newConnectionInfo[previousLevel][currentLMAtLevel].push(connInfo);
	                            	// }
		                        });

	                            var currentNode = nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel];
	                            currentNode.uniqueID.forEach((nodeID) => {
	                            	newNodeArray[previousLevel][currentLMAtLevel].uniqueID.push(nodeID);
	                            });

	                            // found the node we want, break out of the loop
	                            return;
	                        }

	                            // continue with the for loop
	                	} // end of for loop
	                }
                }); // end of lmAtLevelList
 			}
        }); // end of treeLevels
        // console.log("finish groupNodeToParent");
        // console.log(newNodeArray);
        // console.log(newNodeArray[28][7152]['parentLMID']);
        return { newNodeArray, newConnectionInfo };
    }

    const labelList = {};
    var nodeList = {};
    const edgeList = {};

    const adjacencyMatrix = {};
    var idList = [];
    const adjacencyMatrixByLabel = {};
    const mapping = {};

    function combineNodes() {
        console.log('begin combineNodes');
        const groupNodeToParentReturn = groupNodeToParent();
        const newNodeArrayFromGroup = groupNodeToParentReturn.newNodeArray;
        const newConnectionInfoFromGroup = groupNodeToParentReturn.newConnectionInfo;

        treeLevels = Object.keys(newNodeArrayFromGroup);
        const newNodeArray = {};// the final node array
        const newConnectionInfo = {};// the final connection info

        // /// assigning id and create adjacency matrix////////////
        let idCounter = 0;
        treeLevels.forEach((treeLev) => {
            const specialIDAtLevelList = Object.keys(newNodeArrayFromGroup[treeLev]);
            specialIDAtLevelList.forEach((currentSpecialID) => {
                const sankeyNode = newNodeArrayFromGroup[treeLev][currentSpecialID];
                sankeyNode.sankeyID = idCounter;
                const connectionInfo = newConnectionInfoFromGroup[treeLev][currentSpecialID];
                nodeList[idCounter] = sankeyNode;
                edgeList[idCounter] = connectionInfo;
                maxLMID = Math.max(parseInt(currentSpecialID), maxLMID);
                idCounter += 1;
            });
        });

        // console.log("after assigning id", idCounter);

        treeLevels.forEach((treeLev, idx) => {
            const currentTreeLevel = treeLev;
            if (idx > 0) {
                const specialIDAtLevelList = Object.keys(newNodeArrayFromGroup[treeLev]);
                specialIDAtLevelList.forEach((currentSpecialID) => {
                    const sankeyNode = newNodeArrayFromGroup[treeLev][currentSpecialID];
                    const sankeyNodeID = sankeyNode.sankeyID;
                    adjacencyMatrix[sankeyNodeID] = [];

                    const connectionInfoList = newConnectionInfoFromGroup[treeLev][currentSpecialID];
                    const parentSpecialIDList = [];
                    connectionInfoList.forEach((connInfo) => {
                        const parentLMID = connInfo.parentLoadModID;
                        if (parentSpecialIDList.indexOf(parentLMID) == -1) {
                            parentSpecialIDList.push(parseInt(parentLMID));
                        }
                    });

                    parentSpecialIDList.forEach((parentLMID) => {
                        for (let i = parseInt(currentTreeLevel) - 1; i >= 0; i--) {
                            const previousLev = i;
                            const specialIDAtThisLevel = Object.keys(newNodeArrayFromGroup[previousLev]);
                            var loadModAtLevel = [];
                            specialIDAtThisLevel.forEach((lm) => {
                                loadModAtLevel.push(parseInt(lm));
                            });

                            if (loadModAtLevel.indexOf(parentLMID) > -1) {
                                const parSankeyID = newNodeArrayFromGroup[previousLev][parentLMID].sankeyID;

                                if (adjacencyMatrix[parSankeyID] != null) {
                                    adjacencyMatrix[parSankeyID].push(sankeyNodeID);
                                } else {
                                    console.log('something is wrong', parSankeyID, 'currentSpecialID is', currentSpecialID);
                                }

                                break;
                            }
                        }
                    });
                });
            } else {
                adjacencyMatrix[0] = [];
            }
        });

        idList = Object.keys(adjacencyMatrix);
        idList.sort((a, b) => a - b);

        idList.forEach((id) => {
            const node = nodeList[id];
            const label = parseInt(node.loadModID);
            if (labelList[label] == null) {
                labelList[label] = [];
            }
            labelList[label].push(parseInt(id));
        });


        const seenLabelBefore = [];
        const finalNodeList = {};

        idList.forEach((id) => {
            const connection = adjacencyMatrix[id];
            const node = nodeList[id];
            let nodeLabel = parseInt(node.loadModID);
            if (seenLabelBefore.indexOf(nodeLabel) == -1) {
                finalNodeList[id] = node;
                adjacencyMatrixByLabel[nodeLabel] = [];
                seenLabelBefore.push(nodeLabel);
            } else {
                // change the label
                const availableLabels = Object.keys(labelList);
                availableLabels.forEach((lab) => {
                    const ids = labelList[lab];

                    if (ids.indexOf(parseInt(id)) >= 0) {
                        nodeLabel = lab;
                    }
                });

                if (node.loadModID == nodeLabel) {

                } else {
                    node.loadModID = nodeLabel;
                }
            }

            connection.forEach((connID) => {
                let toLabel;
                const availableLabels = Object.keys(labelList);
                availableLabels.forEach((lab) => {
                    // if(id==4){
                    // 	console.log(labelList[lab], lab);
                    // }
                    const ids = labelList[lab];

                    if (ids.indexOf(parseInt(parseInt(connID))) >= 0) {
                        toLabel = lab;
                    }
                });

                addEdge(id, nodeLabel, connID, toLabel);
            });
        });

        // console.log(adjacencyMatrixByLabel);

        Object.keys(labelList).forEach((lab) => {
            const tid = labelList[lab][0];
            const tnode = nodeList[tid];
            // console.log(tnode["name"], lab);

            finalSankeyNodes[lab] = {
                loadModID: lab,
                name: tnode.name,
                uniqueIDList: [],
            };

            finalSankeyEdges[lab] = [];

            labelList[lab].forEach((nID) => {
                const node = nodeList[nID];
                const uniqueIDList = node.uniqueID;
                uniqueIDList.forEach((uniqueID) => {
                    finalSankeyNodes[lab].uniqueIDList.push(uniqueID);
                    nodeInfo[uniqueID].loadModID = lab;
                });

                const edges = edgeList[nID];
                edges.forEach((edge) => {
                    finalSankeyEdges[lab].push(edge);
                });
            });
        });
    }

    function calcEdge() {
        combineNodes();
        let sankIDCounter = 0;
        let name;
        const idMap = {};
        const finalNodes = {};
        const finalEdges = [];
        const finalEdgeList = {};
        const nodeIDConnectionList = {};
        const finalConnectionInfo = {};

        const removeConns = {};
        const removeNodeID = [];

        const finalLabels = Object.keys(adjacencyMatrixByLabel);
        finalLabels.forEach((sourceLabel) => {
            const uniqueIDList = []; // this store the unigue node id taken from the tree node;
            const sankeyNodeList = []; // this list contains the sankey nodes that make up this final node
            let totalRuntime = 0;
            let rawRunTime = 0;
            const sourceIDList = labelList[sourceLabel];
            const connectToLabelList = adjacencyMatrixByLabel[sourceLabel];
            let oldSpecialID;

            if (sourceIDList.length > 0) {
                const tempID = sourceIDList[0];
                name = nodeList[tempID].name;
            }
            sourceIDList.forEach((sID) => {
                const sUniqueID = nodeList[sID].uniqueID;
                if (sankeyNodeList.indexOf(sID) == -1) {
                    sankeyNodeList.push(sID);
                }


                sUniqueID.forEach((id) => {
                    if (uniqueIDList.indexOf(id) == -1) {
                        uniqueIDList.push(id);
                    }
                });
            });
            connectToLabelList.forEach((connLabel) => {
                const connectToIDList = labelList[connLabel];
                let runTimeVal = 0;
                const nodeIDUniqueList = [];
                let runTimeAvg = 0;

                connectToIDList.forEach((tIDtemp) => {
                    const tID = parseInt(tIDtemp);
                    sourceIDList.forEach((sIDtemp) => {
                        const sID = parseInt(sIDtemp);

                        const connectionList = edgeList[tID];
                        let ttemp = 0;
                        connectionList.forEach((connInfo) => {
                            if (nodeList[sID].uniqueID.indexOf(connInfo.parentNodeID) > -1
								&& (connInfo.type == 'PF' || connInfo.type == 'PR')
                            ) {
                                const nodeID = connInfo.nodeID;
                                nodeIDUniqueList.push(nodeID);
                                let sumOfRunTimeForThisNode = 0;
                                const runTimeInc = nodeMetric[nodeID].inc;
                                runTimeInc.forEach((val) => {
                                    runTimeVal += val;
                                    ttemp += val;
                                    sumOfRunTimeForThisNode += val;
                                });

                                runTimeAvg += sumOfRunTimeForThisNode / Math.max(runTimeInc.length, 1);
                            }
                        });// end of connectionList
                    }); // end of sourceIDList
                }); // end of connectToIDList

                // filter out all small edges
                if (runTimeVal > rootRuntime * FILTERPERCENT * 1) {
                    if (sourceLabel == '7159') {
//                        console.log(connLabel);
                    }
                    // totalRuntime += runTimeVal;
                    totalRuntime += runTimeAvg;
                    rawRunTime += runTimeVal;
                    const tempEdge = {
                        // "value" : runTimeVal == 0 ? 1 : runTimeVal,
                        value: runTimeAvg == 0 ? 1 : runTimeAvg,
                        sourceLoadModID: sourceLabel,
                        targetLoadModID: connLabel,
                    };
                    // fs.appendFileSync("edgeInfo", JSON.stringify(tempEdge) + "\n");
                    const tSourceSpcID = sourceLabel;
                    const tTargetSpcID = connLabel;
                    if (finalEdgeList[tSourceSpcID] == null) {
                    	finalEdgeList[tSourceSpcID] = {};
                    	nodeIDConnectionList[tSourceSpcID] = {};
                    }
                    if (finalEdgeList[tSourceSpcID][tTargetSpcID] == null) {
                    	finalEdgeList[tSourceSpcID][tTargetSpcID] = 0;
                    	nodeIDConnectionList[tSourceSpcID][tTargetSpcID] = [];
                    }
                    finalEdgeList[tSourceSpcID][tTargetSpcID] += tempEdge.value;
                    nodeIDUniqueList.forEach((nodeID) => {
                    	nodeIDConnectionList[tSourceSpcID][tTargetSpcID].push(nodeID);
                    });
                } else {
                    if (removeConns[sourceLabel] == null) {
                        removeConns[sourceLabel] = [];
                    }
                    removeConns[sourceLabel].push(connLabel);
                    // if(sourceLabel == "5649" && connLabel == "7091"){
                    // 	console.log(nodeIDUniqueList);
                    // }
                    nodeIDUniqueList.forEach((nID) => {
                        if (removeNodeID.indexOf(nID) == -1) {
                            removeNodeID.push(nID);
                        }
                    });
                }
            });	// end of connectToLabelList

            finalNodes[sourceLabel] = {
                sankeyID: sankIDCounter,
                name,
                specialID: sourceLabel,
                runTime: totalRuntime,
                rawRunTime,
                oldSpecialID,
                uniqueNodeID: uniqueIDList,
                sankeyNodeList,
            };

//            console.log('the node', sourceLabel, uniqueIDList.length);

            const connections = [];
            sankeyNodeList.forEach((id) => {
                const conns = edgeList[id];
                conns.forEach((conn) => {
                    conn.parentLoadModID = nodeInfo[conn.parentNodeID].loadModID;
                    conn.loadModID = nodeInfo[conn.nodeID].loadModID;


                    // if(conn["value"] > rootRuntime * FILTERPERCENT * 1){
                    // connections.push(conn);
                    // }

                    if (conn.loadModID == '7091' && conn.parentLoadModID == '5649') {
                        // console.log();
                    }

                    if (removeNodeID.indexOf(conn.nodeID) == -1) {
                        connections.push(conn);
                        if (conn.loadModID == '7091' && conn.parentLoadModID == '5579') {
                            // console.log('I was not remove');
                        }
                    } else if (conn.loadModID == '7091' && conn.parentLoadModID == '5579') {
                        // console.log('I was remove');
                    }
                });
            });

            finalConnectionInfo[sourceLabel] = connections;

            idMap[sourceLabel] = sankIDCounter;
            sankIDCounter += 1;

            const removedLables = removeConns[sourceLabel];
            if (removedLables != null) {
                removedLables.forEach((lab) => {
                    const removeIndex = adjacencyMatrixByLabel[sourceLabel].indexOf(lab.toString());
                    if (removeIndex > -1) {
                        adjacencyMatrixByLabel[sourceLabel].splice(removeIndex, 1);
                    }
                });
            }
        });	// end of finalLabels

        // console.log(idMap);

        const finalEdgeLabelList = Object.keys(finalEdgeList);
        finalEdgeLabelList.forEach((fromLabel) => {
            const connectToLab = Object.keys(finalEdgeList[fromLabel]);
            connectToLab.forEach((target) => {
                const temp = {
                    source: idMap[fromLabel],
                    target: idMap[target],
                    sourceID: idMap[fromLabel],
                    targetID: idMap[target],
                    sourceLabel: fromLabel,
                    targetLabel: target,
                    value: finalEdgeList[fromLabel][target],
                    nodeIDList: [],
                };
                // fs.appendFileSync("edgeInfo", JSON.stringify(temp) + "\n");
                const uniqueIDListNode = nodeIDConnectionList[fromLabel][target];
                const tmpList = [];
                uniqueIDListNode.forEach((nID) => {
                    if (tmpList.indexOf(nID) == -1) {
                        tmpList.push(nID);
                    }
                });
                temp.nodeIDList = tmpList;
                finalEdges.push(temp);
            });
        });


//        console.log(adjacencyMatrixByLabel);
//        console.log(rootRuntime);
        // console.log(removeNodeID)
        return {
            nodes: finalNodes, edges: finalEdges, nodeList, edgeList, connInfo: finalConnectionInfo, adjMatrix: adjacencyMatrixByLabel,
        };
    }

    function addEdge(fromID, fromLabel, toID, toLabel) {
        const canReach = isReachable(toLabel, fromLabel);

        if (canReach) {
            // check for other mapping
            if (mapping[toLabel] == null) { // we never got this mapping before so create a new one
                mapping[toLabel] = [];
                maxLMID += 1;
                var newLabel = maxLMID;
                mapping[toLabel].push(newLabel);

                const labelsOfadjacencyMatrixByLabel = [];
                adjacencyMatrixByLabel[fromLabel].forEach((lb) => {
                    labelsOfadjacencyMatrixByLabel.push(parseInt(lb));
                });

                if (labelsOfadjacencyMatrixByLabel.indexOf(newLabel) == -1) {
                    adjacencyMatrixByLabel[fromLabel].push(newLabel);
                }
                adjacencyMatrixByLabel[newLabel] = [];

                var oldIndexInLabelList = labelList[parseInt(toLabel)].indexOf(parseInt(toID));
                if (oldIndexInLabelList > -1) {
                    labelList[parseInt(toLabel)].splice(oldIndexInLabelList, 1);
                }

                labelList[parseInt(newLabel)] = [];
                labelList[parseInt(newLabel)].push(parseInt(toID));
                if (parseInt(nodeList[toID].loadModID) == parseInt(toLabel)) {
                    nodeList[toID].loadModID = newLabel;
                }
            } else {
                const map = mapping[toLabel];
                let needToCreateNewMapBool = true;
                var newLabel;

                map.some((mapToTry) => {
                    needToCreateNewMapBool = isReachable(mapToTry, fromLabel);
                    if (needToCreateNewMapBool == false) {
                        newLabel = mapToTry;
                        return true;
                    }
                });

                if (needToCreateNewMapBool) {
                    // console.log("we need to create new label");
                    maxLMID += 1;
                    newLabel = maxLMID;
                    var oldIndexInLabelList = labelList[toLabel].indexOf(parseInt(toID));
                    if (oldIndexInLabelList > -1) {
                        labelList[toLabel].splice(oldIndexInLabelList, 1);
                    }
                    labelList[newLabel] = [];
                    labelList[newLabel].push(parseInt(toID));
                    // adjacencyMatrixByLabel[fromLabel].push(newLabel);
                    if (adjacencyMatrixByLabel[fromLabel].indexOf(newLabel) == -1) {
                        adjacencyMatrixByLabel[fromLabel].push(newLabel);
                    }
                    adjacencyMatrixByLabel[newLabel] = [];
                } else {
                    var oldIndexInLabelList = labelList[toLabel].indexOf(parseInt(toID));
                    if (oldIndexInLabelList > -1) {
                        labelList[toLabel].splice(oldIndexInLabelList, 1);
                    }
                    labelList[parseInt(newLabel)].push(parseInt(toID));
                    if (parseInt(nodeList[toID].loadModID) == parseInt(toLabel)) {
                        nodeList[toID].loadModID = newLabel;
                    }

                    // adjacencyMatrixByLabel[fromLabel].push(newLabel);
                    if (adjacencyMatrixByLabel[fromLabel].indexOf(newLabel) == -1) {
                        adjacencyMatrixByLabel[fromLabel].push(newLabel);
                    }
                    if (adjacencyMatrixByLabel[newLabel] == null) {
                        adjacencyMatrixByLabel[newLabel] = [];
                    }
                }
            }
        } else {
            if (fromLabel != toLabel) {
                if (adjacencyMatrixByLabel[fromLabel].indexOf(toLabel) == -1) {
                    adjacencyMatrixByLabel[fromLabel].push(toLabel);
                }
            }
            if (adjacencyMatrixByLabel[toLabel] == null) {
                adjacencyMatrixByLabel[toLabel] = [];
            }
        }
    }

    function isReachable(sourceLabel, toLabel) {
        const visited = {};
        Object.keys(adjacencyMatrixByLabel).forEach((nLabel) => {
            visited[nLabel] = { visited: false };
        });

        if (visited[sourceLabel] != null && sourceLabel != toLabel) {
            const queue = [];
            queue.unshift(sourceLabel); // add to front
            visited[sourceLabel].visited = true;

            while (queue.length > 0) {
                const n = queue.shift();

                if (n == toLabel) {
                    return true;
                }
                var tLabelList = [];
                adjacencyMatrixByLabel[n].forEach((t) => {
                    tLabelList.push(t);
                });

                tLabelList.forEach((tLabel) => {
                    if (visited[tLabel] != null) {
                        if (visited[tLabel].visited == false) {
                            queue.unshift(tLabel);
                            visited[tLabel].visited = true;
                        }
                    }
                });
            }
        }

        return false;
    }

    this.compute = function () {
        const res = calcEdge();
        return { newSankey: res };
        // combineNodes()
        // groupNodeToParent();
    };
};
module.exports = graphBuilder;
