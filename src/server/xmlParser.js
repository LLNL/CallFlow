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
const parser = require('libxmljs');
const Q = require('bluebird');

const sankeyCalc = require('./sankeyCalc.js');

let debug = true;

const init  = function (xmlTree, xmlFile, configFileName, procIDArray, nodeMetrics, splitByParentList, nodeKeep) {
    var deferred  = Q.defer();
    let config = {};

/*    if (fs.existsSync(configFileName)) {
        // console.log('config file found at', configFileName);
        config = require(configFileName);
    } else {
	console.log('no config file found at', configFileName);
        config = {};
    }
*/
    if(debug){
	console.log('[Data Process] Start parsing xml file.', xmlFile);
    }

    let obj;
    const date1 = new Date();
    if (xmlTree) {
        obj = xmlTree;
    } else {
        const xml = fs.readFileSync(xmlFile, 'utf8');
        obj = parser.parseXmlString(xml, { noblanks: true });

        xmlTree = obj;
    }
    // console.log('finish parsing xml file');
    const date2 = new Date();
    const fileTable = {};
    const loadModuleTable = {};
    const procedureTable = {};

    // var nodeMetric = {};
    const flatProfile = {};
    const flatIDCounter = 0;

    const procTableByLM = {};

    // access using nodeID, contain lmID, parent nodeID, parent lmID, and level
    const edgesInfo = {};

    var entryExitData = {};

    const finalTree = {}; // access using lm id, one entry per lm
    const nodeList = {}; // access uing lm id, one array per lm, array contains node ids of lm

    const lmIDToSplitConfig = []; // contains the lm id that we want to split based on the config file

    const splitLoadModuleFileID = {}; // contain the list of file id for each load module that we want to split, top access by the lm id of spliting load module, next by the name of the new splited module
    // for example: miranda lm is 8, splitting into drivers, io, ect
    // so we have splitLoadModuleFileID[8]["Driver"] = {fileList: [], index: SomeNumb}

    const configNameToID = {}; // from the config file, map the name of the loadmodule to the

    const configLMSplitInfo = {}; // access by load module id

    let prefixID = 0;
    const fileIDTaleOrgName = {};

    let maxLMID = 0;

    const lmName = [];

    const procIDToLMIDMap = {};

    const functionList = {};

    function parseLoadModule(xmlLoadModNode) {
        xmlLoadModNode.childNodes().forEach((loadMod) => {
            const id = parseInt(loadMod.attr('i').value());
            const name = loadMod.attr('n').value();
            // loadModuleTable[id] = name;

            const regName = /([^/]+$)/g.exec(name);

            let newName;
            if (regName != null) { newName = regName[1]; } else { newName = name; }

            loadModuleTable[id] = newName;
            lmName.push(newName);
            const loadmodofsplitname = Object.keys(config);
            // console.log("loadmodofsplitname", loadmodofsplitname);

            // check the name of the file, and match the file to the load module that we want to split
            loadmodofsplitname.forEach((lmofsplit) => {
                if (name.indexOf(lmofsplit) > -1) {
                    if (lmIDToSplitConfig.indexOf(id) == -1) {
                        lmIDToSplitConfig.push(id);
                    }

                    configLMSplitInfo[id] = {
                        files: config[lmofsplit].files,
                        functions: config[lmofsplit].functions,
                    };
                }
            });

            maxLMID = Math.max(maxLMID, id);
        });

        // console.log("configLMSplitInfo", configLMSplitInfo);
    }

    // get the fileTable


    function parseFileTable(xmlFileTableNode) {
        const prefixes = [];
        // var prefixID = 0;
        lmIDToSplitConfig.forEach((lmToSplitID) => {
            splitLoadModuleFileID[lmToSplitID] = {};
        });

        xmlFileTableNode.childNodes().forEach((file) => {
            const id = parseInt(file.attr('i').value());
            const name = file.attr('n').value();
            fileIDTaleOrgName[id] = name;
            const regName = /([^/]+$)/g.exec(name);

            let newName;
            if (regName != null) { newName = regName[1]; } else { newName = name; }
            // console.log(name, newName);

            fileTable[id] = newName;
        });
    }

    // get the procedureTable
    function parseProcedureTable(xmlProcedureTableNode) {
        xmlProcedureTableNode.childNodes().forEach((file) => {
            const id = parseInt(file.attr('i').value());
            const name = file.attr('n').value();
            procedureTable[id] = name;
        });
    }

    const runtimeID = {};

    function parseMetrics(xmlMetricNode) {
        xmlMetricNode.childNodes().forEach((metric) => {
            const id = parseInt(metric.attr('i').value());
            const name = metric.attr('n').value();

            if (name.indexOf('WALLCLOCK') !== -1 || name.indexOf('REALTIME') !== -1) {
                const temp = {
                    n: name,
                    t: metric.attr('t').value(),
                };
                runtimeID[id] = temp;
            }
        });
    }


    // this function parse the tables in the xml file
    function parseProfileTable(xmlNode) {
        xmlNode.childNodes().forEach((child) => {
            const childName = child.name();
            if (childName == 'MetricTable') {
                parseMetrics(child);
            } else if (childName == 'LoadModuleTable') {
                parseLoadModule(child);
            } else if (childName == 'FileTable') {
                parseFileTable(child);
            } else if (childName == 'ProcedureTable') {
                parseProcedureTable(child);
            } else {

            }
        });
    }

    const xmlExperimentTables = obj.root().child(1).child(0);
    parseProfileTable(xmlExperimentTables);

    const cct = obj.root().child(1).child(1);
    // console.log(cct.name());

    function Node() {
        return {
            nodeID: null,
            name: '',
            metricID: [],
            loadModuleID: null,
            fileID: null,
            procedureID: null,
            parentID: null,
            children: [],
            Type: '',
            C: false,
        };
    }

    const cctData = [];

    let root;
    let currentFileName = '';
    let currentFileID;
    let currentLoadModID;
    let currentprocedureID;
    let counter = 0;
    let currentCallSiteID;

    const callSiteMetric = {};


    const callMetrixData = {};
    var entryExitData = {};

    const nodeInfo = {};

    const nodeArray = {};
    let sanKeyIDLM = 0;
    const sanKeyMetricDataLM = {};

    // sepperate by level and lmID
    // tell us the children of this lmid
    const connectionInfo = {};

    const nodePaths = {};

    const internalNodeList = {};

    parseNodes(cct, null, 'false', 0);

    function parseSecCallPathProfileData(xmlNode, level) {
        root = new Node();

        const name = 'Experiment Aggregate Metrics';
        root.name = name;
        root.nodeID = 1;
        root.parentID = 1;
        root.Type = 'Root';
        root.level = level;

        root.procedureID = 0;
        root.loadModuleID = 0;
        root.path = root.nodeID;
        root.specialIDName = 'Root';

        nodePaths[root.nodeID] = root.path;

        const tempID = `LM${0}`;

        root.specialID = tempID;

        // /////////Sankey call path of LM////////////////////
        if (nodeArray[level] == null) {
            nodeArray[level] = {};
            sanKeyMetricDataLM[level] = {};
            connectionInfo[level] = {};
        }
        nodeArray[level][tempID] = {
            name: 'Root',
            inTime: 0,
            exTime: 0,
            lmID: 0,
            procID: 0,
            myID: sanKeyIDLM,
            level,
            type: 'LM',
            specialID: tempID,
            uniqueID: [],
        };
        sanKeyMetricDataLM[level][tempID] = [];
        // sanKeyMetricData[level]["root"].push(root.nodeID);
        sanKeyMetricDataLM[level][tempID].push({
            nodeID: root.nodeID, parentNodeID: null, nodeLevel: level, parentSpecialID: null,
        });

        nodeArray[level][tempID].uniqueID.push(root.nodeID);

        connectionInfo[level][tempID] = [];

        sanKeyIDLM += 1;

        // ///////////End/////////////////////////////////////

        entryExitData[tempID] = {
            name: 'root',
            nodeIDs: [], // an array to store the id of tree nodes
            exit: [], // array to store procedures that call proc from different lm
            enter: [], // array to store procs that was call from different lm
        };

        const nextLevel = level + 1;
        internalNodeList[root.nodeID] = root;
        xmlNode.childNodes().forEach((child) => {
            if (child.name() != 'M') { parseNodes(child, root, 'false', nextLevel); }
        });
    }

    function parsePF(xmlNode, parentNode, Cid, level) {
        const newNode = createNewNodeFromXML(xmlNode, 'PF', level, parentNode);

        const nextLevel = level + 1;

        const getSpecialIDNameTypeRes = getSpecialIDNameType(newNode);
        const tempID = getSpecialIDNameTypeRes.specialID;// = "LM" + newNode.loadModuleID;
        const type = getSpecialIDNameTypeRes.type;
        const name = getSpecialIDNameTypeRes.name;
        newNode.specialID = tempID;
        newNode.specialIDName = name;
        internalNodeList[newNode.nodeID] = newNode;

        // //////lm callpath stuff//////////////////////
        createNewTreeLevel(level);

        createNewTreeNode(level, tempID, name, type, newNode);

        addInfo(level, tempID, newNode, parentNode);

        // ////////////////End////////////////////////////////

        addEntryExitData(tempID, newNode, parentNode);

        if (parentNode.specialID == 'CLM2' && newNode.specialID == 'LM8') {
            const physicsFunc = procedureTable[parentNode.procedureID];
            const mirandaFunc = procedureTable[newNode.procedureID];

            const physicsFile = fileTable[parentNode.fileID];
            const mirandaFile = fileTable[newNode.fileID];
            const temp = {
                'physics funtion': physicsFunc,
                'miranda function': mirandaFunc,
                'physics file': physicsFunc,
                'miranda file': mirandaFile,
            };
            // fs.appendFileSync("physicstomiranda", JSON.stringify(temp) + "\n");
        }

        xmlNode.childNodes().forEach((child) => {
            if (child.name() != 'M') {
                parseNodes(child, newNode, 'false', nextLevel);
            }
        });
    }

    function parseC(xmlNode, parentNode, level) {
        xmlNode.childNodes().forEach((child) => {
            if (child.name() != 'M') {
                parseNodes(child, parentNode, 'true', level);
            }
        });
    }

    function parseLoop(xmlNode, parentNode, level) {
        const newNode = createNewNodeFromXML(xmlNode, 'Loop', level, parentNode);

        const getSpecialIDNameTypeRes = getSpecialIDNameType(newNode);
        const tempID = getSpecialIDNameTypeRes.specialID;// = "LM" + newNode.loadModuleID;
        const type = getSpecialIDNameTypeRes.type;
        const name = getSpecialIDNameTypeRes.name;

        newNode.specialID = tempID;
        newNode.specialIDName = name;
        internalNodeList[newNode.nodeID] = newNode;

        // ////////lm callpath stuff//////////////////////
        createNewTreeLevel(level);

        createNewTreeNode(level, tempID, name, type, newNode);

        addInfo(level, tempID, newNode, parentNode);
        // //////////////////End////////////////////////////////


        const nextLevel = level + 1;
        xmlNode.childNodes().forEach((child) => {
            if (child.name() != 'M') {
                parseNodes(child, newNode, 'false', nextLevel);
            }
        });
    }

    function parseLine(xmlNode, parentNode, level) {
        const newNode = createNewNodeFromXML(xmlNode, 'Line', level, parentNode);

        const getSpecialIDNameTypeRes = getSpecialIDNameType(newNode);
        const tempID = getSpecialIDNameTypeRes.specialID;// = "LM" + newNode.loadModuleID;
        const type = getSpecialIDNameTypeRes.type;
        const name = getSpecialIDNameTypeRes.name;

        newNode.specialID = tempID;
        newNode.specialIDName = name;
        internalNodeList[newNode.nodeID] = newNode;

        // newNode.loadModuleID = currentLoadModID;


        // //////lm callpath stuff//////////////////////
        createNewTreeLevel(level);

        createNewTreeNode(level, tempID, name, type, newNode);

        addInfo(level, tempID, newNode, parentNode);
        // ////////////////End////////////////////////////////


        const nextLevel = level + 1;
        xmlNode.childNodes().forEach((child) => {
            if (child.name() != 'M') {
                parseNodes(child, newNode, 'false', nextLevel);
            }
        });
    }

    function parsePR(xmlNode, parentNode, level) {
        const newNode = createNewNodeFromXML(xmlNode, 'PR', level, parentNode);

        const getSpecialIDNameTypeRes = getSpecialIDNameType(newNode);
        const tempID = getSpecialIDNameTypeRes.specialID;// = "LM" + newNode.loadModuleID;
        const type = getSpecialIDNameTypeRes.type;
        const name = getSpecialIDNameTypeRes.name;

        newNode.specialID = tempID;
        newNode.specialIDName = name;
        internalNodeList[newNode.nodeID] = newNode;

        // //////lm callpath stuff//////////////////////
        createNewTreeLevel(level);

        createNewTreeNode(level, tempID, name, type, newNode);

        addInfo(level, tempID, newNode, parentNode);
        // ////////////////End////////////////////////////////

        addEntryExitData(tempID, newNode, parentNode);

        const nextLevel = level + 1;
        xmlNode.childNodes().forEach((child) => {
            if (child.name() != 'M') {
                parseNodes(child, newNode, 'false', nextLevel);
            }
        });
    }

    function parseNodes(xmlNode, parentNode, Cid, level) {
        const xmlNodeName = xmlNode.name();
        // console.log(xmlNodeName);

        if (xmlNodeName == 'SecCallPathProfileData' ||
            xmlNodeName == 'PF' ||
            xmlNodeName == 'C' ||
            xmlNodeName == 'S' ||
            xmlNodeName == 'L' ||
            xmlNodeName == 'Pr') {
            // console.log(xmlNodeName);
            let nodeID;
            if (xmlNodeName == 'SecCallPathProfileData') {
                nodeID = 1;
            } else {
                nodeID = parseInt(xmlNode.attr('i').value());
            }

            // console.log(nodeID, nodeKeep.indexOf(nodeID) > -1)

            if (nodeKeep.indexOf(nodeID) > -1 || xmlNodeName == 'C') {
                if (xmlNodeName == 'SecCallPathProfileData') {
                    counter++;
                    parseSecCallPathProfileData(xmlNode, level);
                } else if (xmlNodeName == 'PF') {
                    counter++;
                    parsePF(xmlNode, parentNode, Cid, level);
                } else if (xmlNodeName == 'C') {
                    // counter++;
                    parseC(xmlNode, parentNode, level);
                } else if (xmlNodeName == 'S') {
                    counter++;
                    parseLine(xmlNode, parentNode, level);
                } else if (xmlNodeName == 'L') {
                    counter++;
                    parseLoop(xmlNode, parentNode, level);
                } else if (xmlNodeName == 'Pr') {
                    counter++;
                    parsePR(xmlNode, parentNode, level);
                }
            }
        }
    }


    // this function create new node from the xml node
    function createNewNodeFromXML(xmlNode, type, level, parentNode) {
    	const newNode = new Node();
    	newNode.nodeID = parseInt(xmlNode.attr('i').value());
    	newNode.Type = type;
    	newNode.parentID = parentNode.nodeID;
    	newNode.parentSpecialID = parentNode.specialID;
    	newNode.level = level;
    	newNode.path = `${parentNode.path}*${newNode.nodeID}`;
    	nodePaths[newNode.nodeID] = newNode.path;

    	if (type == 'PF' || type == 'PR') {
	        newNode.loadModuleID = parseInt(xmlNode.attr('lm').value());
	        newNode.fileID = parseInt(xmlNode.attr('f').value());
	        newNode.procedureID = parseInt(xmlNode.attr('n').value());
	        newNode.name = procedureTable[newNode.procedureID];

	        currentFileID = newNode.fileID;
	        currentLoadModID = newNode.loadModuleID;
	        currentprocedureID = newNode.procedureID;


            newNode.oldLoadModuleID = newNode.loadModuleID;


	        currentFileName = fileTable[newNode.fileID];

            // if(newNode.procedureID == 7104){
            //     fs.appendFileSync("problemNode", JSON.stringify(newNode) + "\n");
            // }
    	}
    	if (type == 'PR') {
    		newNode.aType = parseInt(xmlNode.attr('a').value());
    	}

    	if (type == 'Line') {
    		newNode.lineNumber = parseInt(xmlNode.attr('l').value());
        	// newNode.name = currentFileName + ": " + newNode.lineNumber;
        	// newNode.fileID = currentFileID;
        	// newNode.procedureID = currentprocedureID;
            if (parentNode.fileID != null) {
                newNode.fileID = parentNode.fileID;
            } else {
                newNode.fileID = currentFileID;
            }
            if (parentNode.procedureID != null) {
                newNode.procedureID = parentNode.procedureID;
            } else {
                newNode.procedureID = currentprocedureID;
            }
            newNode.name = `${fileTable[newNode.fileID]}: ${newNode.lineNumber}`;
    	}

    	if (type == 'Loop') {
        	newNode.lineNumber = parseInt(xmlNode.attr('l').value());
            newNode.fileID = parseInt(xmlNode.attr('f').value());
        	newNode.name = `Loop at ${fileTable[newNode.fileID]}: ${newNode.lineNumber}`;
            if (parentNode.procedureID != null) {
                newNode.procedureID = parentNode.procedureID;
            } else {
                newNode.procedureID = currentprocedureID;
            }

        	currentFileID = newNode.fileID;
        	// newNode.procedureID = currentprocedureID;
        	currentFileName = fileTable[newNode.fileID];
    	}

    	if (type == 'Loop' || type == 'Line') {
	        if (parentNode.loadModuleID != null) {
	            newNode.loadModuleID = parentNode.loadModuleID;
	        } else {
	            newNode.loadModuleID = currentLoadModID;
	        }

            newNode.oldLoadModuleID = newNode.loadModuleID;
    	}
    	return newNode;
    }


    // this function determine the specialID, name and type of the node
    function getSpecialIDNameType(node) {
        let specialID;// = "LM" + newNode.loadModuleID;
        let type;
        let name;
        if (procIDArray.indexOf(node.procedureID) > -1) {
            specialID = `PROC${node.procedureID}`;
            type = 'PROC';
            name = procedureTable[node.procedureID];

            if (procIDToLMIDMap[node.procedureID] == null) {
                maxLMID += 1;
                procIDToLMIDMap[node.procedureID] = {
                    newID: maxLMID,
                };

                loadModuleTable[maxLMID] = procedureTable[node.procedureID];
            }

            node.oldLoadModuleID = procIDToLMIDMap[node.procedureID].newID;
        }

        // this lm is the one we want to split based on the config file
        else if (lmIDToSplitConfig.indexOf(node.loadModuleID) > -1) {
            // check for the file names

            // first get all the lm
            specialID = `LM${node.loadModuleID}`;
            type = 'LM';
            name = loadModuleTable[node.loadModuleID];

            // first set default for unknown file
            if (fileTable[node.fileID].includes('unknown file')) {
                specialID = `CLM${node.loadModuleID}-U`;
                type = 'CLM';
                name = `${loadModuleTable[node.loadModuleID]}-unknown`;
            }

            // first check by file
            // This is where we try to figure out which load module the file should fall under
            const filePrefixes = configLMSplitInfo[node.loadModuleID].files;
            const fileName = fileIDTaleOrgName[node.fileID];
            let prefixLen = 0;
            filePrefixes.forEach((prefix) => {
                if (fileName.indexOf(prefix) > 0) {
                    if (prefix.length > prefixLen) {
                        // get everything after the split
                        const afterPrefix = fileName.substr(fileName.indexOf(prefix) + prefix.length);

                        // now split the afterPrefix into parts seperate by the slash /
                        const splits = afterPrefix.split('/');
                        let loadModName = splits[0];

                        // if( prefix == "MILC/MILC7/generic_ks/" ){
                        //     console.log(splits);
                        // }

                        if (splits.length == 1) { // we end up with a file name, so we will use the last porttion of the prefix
                            const prefixSplit = prefix.split('/');
                            loadModName = prefixSplit[prefixSplit.length - 2]; // skip the last one since it is after the / so
                        } else {
                            loadModName = splits[0];
                        }

                        // first get the original lm id;
                        if (splitLoadModuleFileID[node.loadModuleID][loadModName] == null) {
                            maxLMID += 1;
                            splitLoadModuleFileID[node.loadModuleID][loadModName] = { prefixID, fileList: [], newID: maxLMID };
                            prefixID += 1;
                            loadModuleTable[maxLMID] = loadModName;
                        }
                        specialID = `CLM${splitLoadModuleFileID[node.loadModuleID][loadModName].prefixID}`;
                        type = 'CLM';
                        name = loadModName;
                        prefixLen = prefix.length;
                        node.oldLoadModuleID = splitLoadModuleFileID[node.loadModuleID][loadModName].newID;
                    }
                }
            });

            // ///////////////////////////////////

            // now search by functions
            const functionObjectList = Object.keys(configLMSplitInfo[node.loadModuleID].functions);
            functionObjectList.forEach((functionToCheck) => {
                const functionNames = configLMSplitInfo[node.loadModuleID].functions[functionToCheck];
                functionNames.forEach((fName) => {
                    if (procedureTable[node.procedureID].includes(fName)) {
                        if (splitLoadModuleFileID[node.loadModuleID][functionToCheck] == null) {
                            maxLMID += 1;
                            splitLoadModuleFileID[node.loadModuleID][functionToCheck] = { prefixID, fileList: [], newID: maxLMID };
                            prefixID += 1;
                            loadModuleTable[maxLMID] = functionToCheck;
                        }

                        specialID = `CLM${splitLoadModuleFileID[node.loadModuleID][functionToCheck].prefixID}`;
                        type = 'CLM';
                        name = functionToCheck;
                        node.oldLoadModuleID = splitLoadModuleFileID[node.loadModuleID][functionToCheck].newID;
                    }
                });
            });
        } else {
            specialID = `LM${node.loadModuleID}`;
            type = 'LM';
            name = loadModuleTable[node.loadModuleID];
        }

        if (splitByParentList.indexOf(specialID) > -1) {
        	if (internalNodeList[node.parentID].oldLoadModuleID != node.oldLoadModuleID) {
	            specialID = `LM${internalNodeList[node.parentID].oldLoadModuleID}-` + `LM${node.oldLoadModuleID}`;
            	type = 'LM' + '-' + 'LM';
            	name = `${loadModuleTable[internalNodeList[node.parentID].oldLoadModuleID]}-${loadModuleTable[node.oldLoadModuleID]}`;
        	} else {
        		nodePath = node.path;
        		const nodePathID = nodePath.split('*');
        		nodePathID.pop();
        		nodePathID.sort((a, b) => parseInt(b) - parseInt(a));
        		nodePathID.some((nodeID) => {
        			// console.log(nodeID, node.nodeID);

        			const parLMID = internalNodeList[parseInt(nodeID)].oldLoadModuleID;
        			if (parLMID != node.oldLoadModuleID) {
        				specialID = `LM${parLMID}-` + `LM${node.oldLoadModuleID}`;
        				type = 'LM' + '-' + 'LM';
        				name = `${loadModuleTable[internalNodeList[parseInt(nodeID)].oldLoadModuleID]}-${loadModuleTable[node.oldLoadModuleID]}`;
        				return true;
        			}
        		});
        	}
        }

        // if(name.includes("miranda") && name != "miranda.x-unknown"){
        //     console.log(name);
        // }

        // console.log(name);


        return {
        	name,
        	specialID,
        	type,
        };
    }

    // this create new tree level if needed
    function createNewTreeLevel(level) {
        if (nodeArray[level] == null) {
            nodeArray[level] = {};
            sanKeyMetricDataLM[level] = {};
            connectionInfo[level] = {};
        }
    }

    // this create new node if needed for the final tree
    function createNewTreeNode(level, specialID, name, type, node) {
        if (nodeArray[level][specialID] == null) {
            nodeArray[level][specialID] = {
                name,
                inTime: 0,
                exTime: 0,
                lmID: node.loadModuleID,
                myID: sanKeyIDLM,
                specialID,
                type,
                parentSpecialID: [],
                level,
                uniqueID: [],
            };

            sanKeyIDLM += 1;

            sanKeyMetricDataLM[level][specialID] = [];
            connectionInfo[level][specialID] = [];
        }
    }

    // this add new info into the nodearray, sankeymetric, and connectionInfo
    function addInfo(level, specialID, node, parentNode) {
        if (nodeArray[level][specialID].uniqueID.indexOf(node.nodeID) == -1) {
            nodeArray[level][specialID].uniqueID.push(node.nodeID);
        }

        sanKeyMetricDataLM[level][specialID].push({
            nodeID: node.nodeID, parentLMID: parentNode.loadModuleID, parentNodeID: parentNode.nodeID, nodeLevel: level, parentProcID: parentNode.procedureID, parentSpecialID: parentNode.specialID,
        });

        if (nodeArray[level][specialID].parentSpecialID.indexOf(parentNode.specialID) == -1) {
            nodeArray[level][specialID].parentSpecialID.push(parentNode.specialID);
        }

        let tempTime = 0;

        nodeMetrics[node.nodeID].inc.forEach((val) => {
        	tempTime += val;
        });

        const avgTime = tempTime / Math.max(1, nodeMetrics[node.nodeID].inc.length);

        if (connectionInfo[level][node.specialID] != null) {
        	const connectionNode = {
        		parentNodeID: parentNode.nodeID,
        		parentSpecialID: parentNode.specialID,
        		parentProcedureName: procedureTable[parentNode.procedureID],
        		parentLoadModuleName: parentNode.specialIDName,
        		nodeID: node.nodeID,
        		specialID: node.specialID,
        		procedureName: procedureTable[node.procedureID],
        		// "value" : tempTime,
                value: avgTime,
        		procID: node.procedureID,
                type: node.Type,
        	};

        	connectionInfo[level][node.specialID].push(connectionNode);
        } else {
        	console.log(`something is wrong, the current level is: ${level}, the current specialID is: ${specialID}, the parent specialID is: ${parentNode.specialID}`);
        }

        // ////add node into its function list, only add if node type is PR or PF, ie function call
        if (node.Type == 'PR' || node.Type == 'PF') {
            if (functionList[node.specialID] == null) {
                functionList[node.specialID] = {};
            }
            if (functionList[node.specialID][node.procedureID] == null) {
                functionList[node.specialID][node.procedureID] = [];
            }
            functionList[node.specialID][node.procedureID].push(node.nodeID);
        }
    }

    // this function add in new information for the entry exit data
    function addEntryExitData(specialID, node, parentNode) {
        if (entryExitData[specialID] == null) {
            entryExitData[specialID] = {
                name: specialID,
                exit: [], // array to store procedures that call proc from different lm
                enter: [], // array to store procs that was call from different lm
                entryNodeID: {},
            };
        }

        // parent and current lmid are not the same
        // that mean we have a enter and exit
        if (specialID != parentNode.specialID) {
            if (entryExitData[specialID].enter.indexOf(node.procedureID) == -1) {
                entryExitData[specialID].enter.push(node.procedureID);
            }

            if (entryExitData[specialID].entryNodeID[node.procedureID] == null) {
                entryExitData[specialID].entryNodeID[node.procedureID] = [];
            }
            entryExitData[specialID].entryNodeID[node.procedureID].push(node.nodeID);

            if (entryExitData[parentNode.specialID].exit.indexOf(parentNode.procedureID) == -1) {
                entryExitData[parentNode.specialID].exit.push(parentNode.procedureID);
            }
        }
    }


    // console.log("load module table", JSON.stringify(loadModuleTable));
    // console.log("load module table", JSON.stringify(splitLoadModuleFileID));


    const returnData = {
        nodeArray,
        sanKeyMetricDataLM,
        entryExitData,
        nodePaths,
        connectionInfo,
        procedureTable,
        functionList,
    };

    deferred.resolve(returnData);
    return deferred.promise;
};

const callback = function(data, nodeMetric) {
    let deferred = Q.defer();
    if(debug){
	console.log('[Data Process] XML parsed - Callback');
	console.log('[Data Process] Begin sankey graph calculation');
    }
    nodeArray = data.nodeArray;
    sanKeyMetricDataLM = data.sanKeyMetricDataLM;
    entryExitDataNodeSplit = data.entryExitData;
    nodePaths = data.nodePaths;
    procedureTable = data.procedureTable;

    // from the nodeSplitMiranda.js
    //  const finalTree = data.finalTree;
    //  const keepEdges = data.keepEdges;
    //  const nodeList = data.nodeList;
    //  let keepEdges = data.keepEdges;
    staticFunctionList = data.functionList;

    const connectionInfo = data.connectionInfo;

    //  const cTime1 = new Date();
    // var lmcalc = new calcLM3(nodeArray, nodeMetric, sanKeyMetricDataLM, nodePaths);
    const lmcalc = new sankeyCalc(nodeArray, nodeMetric, sanKeyMetricDataLM, nodePaths, connectionInfo);

    // var lmcalc = new calcMiranda(finalTree, nodeList, nodePaths, nodeMetric, keepEdges);

    const result = lmcalc.compute();
    sankeyData = result.newSankey;
    // nodeRemove = result["nodeRemove"];

    date2 = new Date();

    //  const diff = date2 - date1;
    // console.log("the time it take to load and calc is, ", diff);
    // console.log('the time it take to calc the edges is', date2 - cTime1);

    let nodesDeepCopy = [];
    const edgesDeepCopy = [];
    let nodeListDeepCopy = {};
    let edgeListDeepCopy = {};
    sankeyData.edges.forEach((edge) => {
        const tempObj = JSON.parse(JSON.stringify(edge));
        edgesDeepCopy.push(tempObj);
    });
    nodesDeepCopy = JSON.parse(JSON.stringify(sankeyData.nodes));
    nodeListDeepCopy = JSON.parse(JSON.stringify(sankeyData.nodeList));
    edgeListDeepCopy = JSON.parse(JSON.stringify(sankeyData.edgeList));

    staticGraph = {
        nodes: nodesDeepCopy,
        edges: edgesDeepCopy,
        nodeList: nodeListDeepCopy,
        edgeList: edgeListDeepCopy,
    };

    deferred.resolve(staticGraph);
    return deferred.promise;
}

const splitNodeCallback = function(data, nodeMetric){
    let deferred = Q.defer();
    nodeArray = data.nodeArray;
    sanKeyMetricDataLM = data.sanKeyMetricDataLM;
    entryExitDataNodeSplit = data.entryExitData;
    nodePaths = data.nodePaths;
    procedureTable = data.procedureTable;

    // from the nodeSplitMiranda.js
    const finalTree = data.finalTree;
    var keepEdges = data.keepEdges;
    const nodeList = data.nodeList;
    var keepEdges = data.keepEdges;
    functionList = data.functionList;

    const connectionInfo = data.connectionInfo;
    const cTime1 = new Date();
    // var lmcalc = new calcLM3(nodeArray, nodeMetric, sanKeyMetricDataLM, nodePaths)
    const lmcalc = new sankeyCalc(nodeArray, nodeMetric, sanKeyMetricDataLM, nodePaths, connectionInfo);
    // var lmcalc = new calcMiranda(finalTree, nodeList, nodePaths, nodeMetric, keepEdges);
    const result = lmcalc.compute();
    sankeyData = result.newSankey;
    // var temp = {"nodes" : sankeyData["nodes"], "edges" : sankeyData["edges"]};
    // fs.writeFileSync("nodeEdgeTest2.json", JSON.stringify(temp));
    const hisData = computeHistogram();
    const resData = {
        graph: sankeyData,
        histogramData: hisData,
    };

    if(debug){
	console.log('[Server] Done splitting nodes');
    }
    deferred.resolve(resData);
    return deferred.promise;
}

module.exports = {
    init,
    callback,
    splitNodeCallback
}
