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
const fs = require('fs');

function log(val){
    console.log('[LMCalc] ', val);
}

/* this module computes the sankey nodes and links for the load module */
const LMCalc = function (nodeArray, nodeMetric, sanKeyMetricData, nodePaths, connectionInfo) {
    const nodeRemove = [];
    log(nodeMetric);
    let treeLevels = Object.keys(nodeArray);
    const rootSpecialID = 'LM0';
    let rootRuntime;

    const edges = {};

    const newLMIDMapping = {};// this map the old lmid to the new one
    const newConnectionMap = {};
    const parentChildrenList = {};

    const FILTERPERCENT = 1 / 100;

    const nameList = {};


    function computeTime() {
        // console.log('begin computing runtime for each sankey node');
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

        rootRuntime = nodeArray[0][rootSpecialID].incTime;
        const nodesKeepAfterFilter = {};
        const notInterestSpecID = {};
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

	                notInterestSpecID[treeLev].push(lmAtLevel);
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
		                // notInt.push(parseInt(ni));
		                notInt.push(ni);
		            });
		        }

		        spcIDAtThisLevel.forEach((currentSpcID) => {
		        	const tempParentSpcID = nodesKeepAfterFilter[treeLev][currentSpcID].parentSpecialID;
		            notInt.forEach((nLMID) => {
		            	let nLMIDINT; //= parseInt(nLMID.replace('LM', ''));
		            	nLMIDINT = nLMID;
		                const tempIDX = tempParentSpcID.indexOf(nLMIDINT);

		                if (tempIDX >= 0) {
		                    tempParentSpcID.splice(tempIDX, 1);
		                }
		            });

		             nodesKeepAfterFilter[treeLev][currentSpcID].parentSpecialID = tempParentSpcID;
		        });
            }
        }); // end of treeLevels

        // console.log('finish with filtering nodes');
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
                    const mySpecialID = nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel].specialID;

	                // taking care of the easy case first, which has more than one parents
	                if (nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel].parentSpecialID.length > 1) {
	                    let canMergeBool = false;
	                    let parentSameAsMeLevel;
	                    if (nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel].parentSpecialID.indexOf(currentLMAtLevel) > -1) {
	                    	// so one of my parentspecialid is the same as me
	                    	const otherParentLevel = [];

	                    	const parentsList = nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel].parentSpecialID;
	                    	parentsList.forEach((parSpcID) => {
		                    	for (let tIndex = parseInt(currentTreeLev) - 1; tIndex >= 0; tIndex--) {
		                    		const spcIDAtThisLevel = Object.keys(newNodeArray[tIndex]);
		                    		if (currentLMAtLevel == 'CLM3') {
		                    			// console.log(spcIDAtThisLevel, tIndex);
		                    		}
		                    		if (spcIDAtThisLevel.indexOf(parSpcID) > -1) {
		                    			if (parSpcID == currentLMAtLevel) {
		                    				parentSameAsMeLevel = tIndex;
		                    			} else if (otherParentLevel.indexOf(parSpcID) == -1) {
		                    					otherParentLevel.push(tIndex);
		                    				}
		                    			break;
		                    		}
		                    	}
	                    	}); // end of parentsList

	                    	if (otherParentLevel.indexOf(parentSameAsMeLevel) == -1 && typeof (parentSameAsMeLevel) !== 'undefined') {
	                    		let largestBool = true;
	                    		otherParentLevel.forEach((lev) => {
	                    			if (lev >= parentSameAsMeLevel) {
	                    				largestBool = false;
	                    			}
	                    		});
	                    		canMergeBool = largestBool;
	                    	} else {
	                    		canMergeBool = false;
	                    	}
	                    }

	                    if (canMergeBool) {
	                    	const currentConnectionInfo = connectionInfo[currentTreeLev][currentLMAtLevel];
                            currentConnectionInfo.forEach((connInfo) => {
                            	if (connInfo.specialID != connInfo.parentSpecialID) {
	                                newConnectionInfo[parentSameAsMeLevel][currentLMAtLevel].push(connInfo);
                            	}
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
	                else if (nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel].parentSpecialID.length == 1 &&
	                		 nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel].parentSpecialID[0] != currentLMAtLevel) {
	                	newNodeArray[currentTreeLev][currentLMAtLevel] = nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel];
	                    newConnectionInfo[currentTreeLev][currentLMAtLevel] = connectionInfo[currentTreeLev][currentLMAtLevel];
	                }

	                // if only have one parent and parent lmid is same as current node lmid
	                else if (nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel].parentSpecialID.length == 1 &&
	                		 nodesKeepAfterFilter[currentTreeLev][currentLMAtLevel].parentSpecialID[0] == currentLMAtLevel) {
	                	// look for the node with same lm from previous level
	                	for (let i = currentTreeLev - 1; i >= 0; i--) {
	                		var previousLevel = i;

	                        const prevLevelLM = Object.keys(newNodeArray[previousLevel]);

	                        // check if this prev level has the LM we want
	                        if (prevLevelLM.indexOf(currentLMAtLevel) > -1) {
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
        return { newNodeArray, newConnectionInfo };
    }

    // this function combines nodes such that each lm only have one node
    // unless said node create a cycle we can't ignore
    function combineNodes() {
        // console.log("begin combineNodes");
        const groupNodeToParentReturn = groupNodeToParent();
        const newNodeArrayFromGroup = groupNodeToParentReturn.newNodeArray;
        const newConnectionInfoFromGroup = groupNodeToParentReturn.newConnectionInfo;

        treeLevels = Object.keys(newNodeArrayFromGroup);
        const newNodeArray = {};// the final node array
        const newConnectionInfo = {};// the final connection info

        // access uing the specialid of the current node
        // each contain an array of specialid of the parent
        // also contain the array of specialid of the children
        // when access, if the children filed is null, that mean we haven't seen this id yet


        // var needToChangeSpecialID = [];

        const seenBefore = []; // this keep track of all special id that we have seen before
        const connectTo = {}; // for each lmid, create an array to indicate which lmid it is connect to

        // newConnectionMap[parentLMID] = [
        // 	 {childOldSpecID: oldpscid, childNewSpcID: newspcid}
        // ]
        const newConnectionMap = {};

        treeLevels.forEach((treeLev, idx) => {
            if (idx > 0) {
                newNodeArray[treeLev] = {};
                newConnectionInfo[treeLev] = {};
                const currentTreeLevel = treeLev;
                const lmAtLevelList = Object.keys(newNodeArrayFromGroup[treeLev]);
                lmAtLevelList.forEach((currentLM) => {
                    // first, is there any specialid that we need to change
                    const needToChangeSpecialID = Object.keys(newLMIDMapping);
                    // grap the connection list for this specialID
                    const currentConnList = newConnectionInfoFromGroup[treeLev][currentLM];

                    // first determine if this node need to change its lable, need to combine, or keep it as is
                    if (seenBefore.indexOf(currentLM) > -1) { // ok, so we seen this lm id before
                        // now we need to determine if we need to change its label or need to combine

                        if (newLMIDMapping[currentLM] == null) { // this is a node that we haven't determine to change its label yet, so we just combine it to the previous node
                            calculateEdge(currentLM, currentConnList, false, '');
                        } else {
                            // this might be wrong, but assume that if we have a new mapping, we only have one name
                            const newLabel = newLMIDMapping[currentLM][newLMIDMapping[currentLM].length];

                            var newSankeyNode = newNodeArrayFromGroup[treeLev][currentLM];
                            newSankeyNode.specialID = newLabel;
                            if (parentChildrenList[newLabel] == null) {
                                parentChildrenList[newLabel] = {};
                                parentChildrenList[newLabel].parent = [];
                            }

                            calculateEdge(currentLM, currentConnList, true, newLabel);
                        }
                    } else { // havent seen this lm id before
                        // so we need to create a new sankey node
                        var newSankeyNode = newNodeArrayFromGroup[treeLev][currentLM];
                        seenBefore.push(currentLM);
                        parentChildrenList[currentLM] = {};
                        parentChildrenList[currentLM].parent = [];
                        calculateEdge(currentLM, currentConnList, false, '');
                    }
                }); // end of lmAtLevelList
            } else {
                newNodeArray[0] = newNodeArrayFromGroup[0];
                newConnectionInfo[0] = newConnectionInfoFromGroup[0];
                const connInfoList = [];
                parentChildrenList.LM0 = {};
                const childrenSpecID = [];
                newConnectionInfo[0].LM0.forEach((connInfo) => {
                    // note that we only want the connInfo where the chldspcid is different from the current node
                    if (connInfo.childSpecialID != 'LM0') {
                        connInfoList.push(connInfo);
                        if (childrenSpecID.indexOf(connInfo.childSpecialID) == -1) {
                            childrenSpecID.push(connInfo.childSpecialID);
                        }
                    }
                });
                parentChildrenList.LM0.children = childrenSpecID;
                parentChildrenList.LM0.parent = [];
                // calculateEdge("LM0", connInfoList);
            }
        }); // end of treeLevels

        // console.log("finish combineNodes");
    }

    const labelList = {};
    const nodeList = {};
    const edgeList = {};

    const adjacencyMatrix = {};
    let idList = [];
    const adjacencyMatrixByLabel = {};
    const mapping = {};

    function combineNodes2() {
        // console.log("begin combineNodes");
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
                sankeyNode.oldSpecialID = sankeyNode.specialID;
                const connectionInfo = newConnectionInfoFromGroup[treeLev][currentSpecialID];
                nodeList[idCounter] = sankeyNode;
                edgeList[idCounter] = connectionInfo;
                idCounter += 1;
            });
        });

        console.log('after assigning ids', idCounter);

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
                        const parentSpcID = connInfo.parentSpecialID;
                        if (parentSpecialIDList.indexOf(parentSpcID) == -1) {
                            parentSpecialIDList.push(parentSpcID);
                        }
                    });

                    parentSpecialIDList.forEach((parentSpcID) => {
                        for (let i = parseInt(currentTreeLevel) - 1; i >= 0; i--) {
                            const previousLev = i;
                            const specialIDAtThisLevel = Object.keys(newNodeArrayFromGroup[previousLev]);
                            if (specialIDAtThisLevel.indexOf(parentSpcID) > -1) {
                                const parSankeyID = newNodeArrayFromGroup[previousLev][parentSpcID].sankeyID;

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
        // ///// end of assigning id and create adjacency matrix
        // console.log("finish combineNodes");


        idList = Object.keys(adjacencyMatrix);
        idList.sort((a, b) => a - b);

        idList.forEach((id) => {
            const node = nodeList[id];
            const label = node.specialID;
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
            let nodeLabel = node.specialID;
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

                if (node.specialID == nodeLabel) {

                } else {
                    node.specialID = nodeLabel;
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
    }


    function calcEdge() {
        combineNodes2();
        let sankIDCounter = 0;
        let name;
        const idMap = {};
        const finalNodes = {};
        const finalEdges = [];
        const finalEdgeList = {};

        const nodeIDConnectionList = {};

        const finalLabels = Object.keys(adjacencyMatrixByLabel);
        finalLabels.forEach((sourceLabel) => {
            const uniqueIDList = []; // this store the unigue node id taken from the tree node;
            const sankeyNodeList = []; // this list contains the sankey nodes that make up this final node
            let totalRuntime = 0;
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
                // The problem probably lies in here
                // we are essesnsitally calculate connection by permutate on both list

                let runTimeVal = 0;
                const nodeIDUniqueList = [];
                let runTimeAvg = 0;
                // console.log(connLabel);
                connectToIDList.forEach((tID) => {
                    sourceIDList.forEach((sID) => {
                        // var sourceSpcID = nodeList[sID]["specialID"];
                        const sourceSpcID = nodeList[sID].oldSpecialID;
                        oldSpecialID = nodeList[sID].oldSpecialID;
                        const connectionList = edgeList[tID];
                        // var runTimeVal = 0;
                        let ttemp = 0;


                        connectionList.forEach((connInfo) => {
                            if (// connInfo["parentSpecialID"] == sourceSpcID &&
                                nodeList[sID].uniqueID.indexOf(connInfo.parentNodeID) > -1
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
                }); // end of connectToID

                if (runTimeVal > rootRuntime * FILTERPERCENT * 1) {
                    // totalRuntime += runTimeVal;
                    totalRuntime += runTimeAvg;
                    const tempEdge = {
                        // "value" : runTimeVal == 0 ? 1 : runTimeVal,
                        value: runTimeAvg == 0 ? 1 : runTimeAvg,
                        // "oldSourceSpcID" : sourceSpcID,
                        // "oldTargetSpcID" : nodeList[tID]["oldSpecialID"],
                        // "sourceSpcID" : nodeList[sID]["specialID"],
                        // "targetSpcID" : nodeList[tID]["specialID"]
                        sourceSpcID: sourceLabel,
                        targetSpcID: connLabel,
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
                }
            }); // end of connectToLabelList

            finalNodes[sourceLabel] = {
                sankeyID: sankIDCounter,
                name,
                specialID: sourceLabel,
                runTime: totalRuntime,
                oldSpecialID,
                uniqueNodeID: uniqueIDList,
                sankeyNodeList,
            };

            console.log('there are', sourceLabel, uniqueIDList.length);

            idMap[sourceLabel] = sankIDCounter;
            sankIDCounter += 1;
        }); // end of finalLabels

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

        return {
            nodes: finalNodes, edges: finalEdges, nodeList, edgeList,
        };
    }

    function addEdge(fromID, fromLabel, toID, toLabel) {
        const canReach = isReachable(toLabel, fromLabel);

        if (canReach) {
            // check for other mapping
            if (mapping[toLabel] == null) { // we never got this mapping before so create a new one
                mapping[toLabel] = [];
                var newLabel = `${toLabel}_${mapping[toLabel].length}`;
                mapping[toLabel].push(newLabel);
                // adjacencyMatrixByLabel[fromLabel].push(newLabel);
                if (adjacencyMatrixByLabel[fromLabel].indexOf(newLabel) == -1) {
                    adjacencyMatrixByLabel[fromLabel].push(newLabel);
                }
                adjacencyMatrixByLabel[newLabel] = [];

                var oldIndexInLabelList = labelList[toLabel].indexOf(parseInt(toID));
                if (oldIndexInLabelList > -1) {
                    labelList[toLabel].splice(oldIndexInLabelList, 1);
                }

                labelList[newLabel] = [];
                labelList[newLabel].push(parseInt(toID));
                if (nodeList[toID].specialID == toLabel) {
                    nodeList[toID].specialID = newLabel;
                }
            } else {
                const map = mapping[toLabel];
                let needToCreateNewMapBool = true;
                var newLabel;

                map.forEach((mapToTry) => {
                    needToCreateNewMapBool = isReachable(mapToTry, fromLabel);
                    if (needToCreateNewMapBool == false) {
                        newLabel = mapToTry;
                    }
                });

                if (needToCreateNewMapBool) {
                    // console.log("we need to create new label");
                    newLabel = `${toLabel}_${mapping[toLabel].length}`;
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
                    labelList[newLabel].push(parseInt(toID));
                    if (nodeList[toID].specialID == toLabel) {
                        nodeList[toID].specialID = newLabel;
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

    function calculateEdge(specialIDofCurrentNode, connectionList, needToReLable, newLabel) {
        if (needToReLable) {
            specialIDofCurrentNode = newLabel;
        }

		 // connInfo
		 const connInfoByChild = {};
		 connectionList.forEach((connInfo) => {
		 	const childSpecID = connInfo.childSpecialID;
		 	if (needToReLable) {
		 		connInfo.specialID = newLabel;
		 	}

		 	const parSpcID = connInfo.parentSpecialID;
		 	if (parentChildrenList[connInfo.specialID].parent.indexOf(parSpcID) == -1) {
		 		parentChildrenList[connInfo.specialID].parent.push(parSpcID);
		 	}

		 	if (connInfoByChild[childSpecID] == null) {
		 		connInfoByChild[childSpecID] = [];
		 	}

		 	connInfoByChild[childSpecID].push(connInfo);
		 }); // end of connectionList

		 const chldSpecIDList = Object.keys(connInfoByChild);
		 chldSpecIDList.forEach((childSpecID) => {
		 	// get connection info for this child
		 	const chldConnList = connInfoByChild[childSpecID];

		 	let formCyleBool = false;

		 	let chldRunTime = 0;

		 	const numberOfProcess = 1;

		 	chldConnList.forEach((chldConn) => {
		 		const chldNodeID = chldConn.childID;
		 		const chldNodeRunTimeInc = nodeMetric[chldNodeID].inc;
		 		// numberOfProcess = Math.max(numberOfProcess, chldNodeRunTimeInc.length);
		 		chldNodeRunTimeInc.forEach((val) => {
		 			chldRunTime += val;
		 		}); // end of chldNodeRunTimeInc;

		 		// this will allow us to know wheter or not this specific chldid will form a cycle
		 		const nodeID = chldConn.nodeID;
		 		const chldPath = nodePaths[chldNodeID];
		 		const nodePath = nodePaths[nodeID];
		 		if (chldPath.includes(nodePath)) {
                    formCyleBool = true;
                }
		 	}); // end of chldConnList

		 	// now we have the value, we need to check if we want to keep it
		 	if (chldRunTime >= rootRuntime * FILTERPERCENT) {
		 		if (formCyleBool) { // connect to this child will create a cycle
		 			if (newLMIDMapping[childSpecID] == null) {
		 				newLMIDMapping[childSpecID] = [];
		 			}

		 			let newLabelName;

		 			if (newLMIDMapping[childSpecID] == null) {
		 				newLMIDMapping[childSpecID] = [];
		 			}
		 			if (newConnectionMap[specialIDofCurrentNode] == null && newLMIDMapping[childSpecID] != null && newLMIDMapping[childSpecID].length > 0) {
		 				newLabelName = newLMIDMapping[childSpecID][newLMIDMapping[childSpecID].length];
		 			} else {
		 				newLabelName = `${childSpecID}_${newLMIDMapping[childSpecID].length}`;
		 				newLMIDMapping[childSpecID].push(newLabelName);
		 			}

		 			if (newConnectionMap[specialIDofCurrentNode] == null) {
		 				newConnectionMap[specialIDofCurrentNode] = [];
		 			}
		 			newConnectionMap[specialIDofCurrentNode].push({ oldChildSpecialID: childSpecID, newChildSpecialID: newLabelName });

		 			var tempEdge = {
                        value: chldRunTime == 0 ? 1 : chldRunTime / numberOfProcess,
                        sourceSpcID: specialIDofCurrentNode,
                        targetSpcID: newLabelName,
		 			};

		 			fs.appendFileSync('splitMiranda.json', `${JSON.stringify(tempEdge)}\n`);
		 		} else {
		 			var tempEdge = {
                        value: chldRunTime == 0 ? 1 : chldRunTime / numberOfProcess,
                        sourceSpcID: specialIDofCurrentNode,
                        targetSpcID: childSpecID,
		 			};

		 			fs.appendFileSync('splitMiranda.json', `${JSON.stringify(tempEdge)}\n`);
		 		}
		 	}
		 }); // end of chldSpecIDList
    }

    function detectCycle(specialID, specialIDToCheck) {

    }

    this.compute = function () {
        const res = calcEdge();
        return { newSankey: res };
    };
};

module.exports = LMCalc;
