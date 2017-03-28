var fileLoader = function(xmlTree, fileName, callBack, configFileName, procIDArray, nodeMetrics, splitByParentList, nodeKeep){
	var fs = require('fs');
    var parser = require('libxmljs');
    var config;

    if(fs.existsSync(configFileName)){
        // console.log('config file found at', configFileName);
        config = require(configFileName);
    }
    else{
        // console.log('no config file found at', configFileName);
        config = {};
    }
    

    var xmlFile = fileName;

    // console.log(xmlFile);
    var obj;
    var date1 = new Date();
    console.log('begin parsing xml file');
    if(xmlTree){
        obj = xmlTree;
    }
    else{
        var xml = fs.readFileSync(xmlFile, 'utf8');
        obj = parser.parseXmlString(xml, {noblanks: true});

        xmlTree = obj;
    }
    // console.log('finish parsing xml file');
    var date2 = new Date();
    var fileTable = {};
    var loadModuleTable = {};
    var procedureTable = {};

    // var nodeMetric = {};
    var flatProfile = {};
    var flatIDCounter = 0;

    var procTableByLM = {};

    //access using nodeID, contain lmID, parent nodeID, parent lmID, and level
    var edgesInfo = {};

    var entryExitData = {};

    var finalTree = {}; //access using lm id, one entry per lm
    var nodeList = {}; //access uing lm id, one array per lm, array contains node ids of lm

    var lmIDToSplitConfig = []; //contains the lm id that we want to split based on the config file

    var splitLoadModuleFileID = {}; //contain the list of file id for each load module that we want to split, top access by the lm id of spliting load module, next by the name of the new splited module
    //for example: miranda lm is 8, splitting into drivers, io, ect
    //so we have splitLoadModuleFileID[8]["Driver"] = {fileList: [], index: SomeNumb}

    var configNameToID = {}; //from the config file, map the name of the loadmodule to the 

    var configLMSplitInfo = {}; //access by load module id

    var prefixID = 0;
    var fileIDTaleOrgName = {};

    var maxLMID = 0;

    var lmName = [];

    var procIDToLMIDMap = {};

    var functionList = {};

    function parseLoadModule(xmlLoadModNode){
        xmlLoadModNode.childNodes().forEach(function(loadMod){
            var id = parseInt(loadMod.attr('i').value());
            var name = loadMod.attr('n').value();
            // loadModuleTable[id] = name;

            var regName = /([^/]+$)/g.exec(name);

            var newName;
            if(regName != null)
                newName = regName[1];
            else
                newName = name;

            loadModuleTable[id] = newName;
            lmName.push(newName);
            var loadmodofsplitname = Object.keys(config);
            // console.log("loadmodofsplitname", loadmodofsplitname);

            //check the name of the file, and match the file to the load module that we want to split
            loadmodofsplitname.forEach(function(lmofsplit){
                if(name.indexOf(lmofsplit) > -1){
                    if(lmIDToSplitConfig.indexOf(id) == -1){
                        lmIDToSplitConfig.push(id);
                    }

                    configLMSplitInfo[id] = {
                        "files" : config[lmofsplit]["files"],
                        "functions" : config[lmofsplit]["functions"]
                    }

                }
            })

            maxLMID = Math.max(maxLMID, id);

        })

        // console.log("configLMSplitInfo", configLMSplitInfo);
    }

    //get the fileTable


    function parseFileTable(xmlFileTableNode){

        var prefixes = [];
        // var prefixID = 0;
        lmIDToSplitConfig.forEach(function(lmToSplitID){
            splitLoadModuleFileID[lmToSplitID] = {};
        })

        xmlFileTableNode.childNodes().forEach(function(file){
            var id = parseInt(file.attr('i').value());
            var name = file.attr('n').value();
            fileIDTaleOrgName[id] = name;
            var regName = /([^/]+$)/g.exec(name);

            var newName;
            if(regName != null)
                newName = regName[1];
            else
                newName = name;
            // console.log(name, newName);

            fileTable[id] = newName;

        })
    }

    //get the procedureTable
    function parseProcedureTable(xmlProcedureTableNode){
        xmlProcedureTableNode.childNodes().forEach(function(file){
            var id = parseInt(file.attr('i').value());
            var name = file.attr('n').value();
            procedureTable[id] = name;
        })
    }

    var runtimeID = {};

    function parseMetrics(xmlMetricNode){
        xmlMetricNode.childNodes().forEach(function(metric){
            var id = parseInt(metric.attr('i').value());
            var name = metric.attr('n').value();

            if(name.indexOf("WALLCLOCK") !== - 1 || name.indexOf("REALTIME") !== - 1){
                var temp = {
                    "n" : name,
                    "t" : metric.attr('t').value()
                };
                runtimeID[id] = temp;
            }
        });

    }


    //this function parse the tables in the xml file
    function parseProfileTable(xmlNode){
        xmlNode.childNodes().forEach(function(child){
            var childName = child.name();
            if(childName == "MetricTable"){
                parseMetrics(child);
            }
            else if(childName == "LoadModuleTable"){
                parseLoadModule(child);
            }
            else if(childName == "FileTable"){
                parseFileTable(child);
            }
            else if(childName == "ProcedureTable"){
                parseProcedureTable(child);
            }
            else{
                return;
            }
        })
    }

    var xmlExperimentTables = obj.root().child(1).child(0);
    parseProfileTable(xmlExperimentTables);    

    var cct = obj.root().child(1).child(1);
    // console.log(cct.name());

    function Node(){
        return {
            "nodeID" : null,
            "name" : "",
            "metricID" : [],
            "loadModuleID" : null,
            "fileID" : null,
            "procedureID" : null,
            "parentID" : null,
            "children" : [],
            "Type" : "",
            "C" : false
        };
    }

    var cctData = [];

    var root;
    var currentFileName = "";
    var currentFileID;
    var currentLoadModID;
    var currentprocedureID;
    var counter = 0;   
    var currentCallSiteID;

    var callSiteMetric = {};


    var callMetrixData = {};
    var entryExitData = {};

    var nodeInfo = {};

    var nodeArray = {};
    var sanKeyIDLM = 0;
    var sanKeyMetricDataLM = {};

    //sepperate by level and lmID
    //tell us the children of this lmid
    var connectionInfo = {};

    var nodePaths = {};

    var internalNodeList = {};

    parseNodes(cct, null, "false", 0);

    function parseSecCallPathProfileData(xmlNode, level){
        root = new Node();

        var name = "Experiment Aggregate Metrics";
        root.name = name;
        root.nodeID = 1;
        root.parentID = 1;
        root.Type = "Root";
        root.level = level;

        root.procedureID = 0;
        root.loadModuleID = 0;
        root.path = root.nodeID;
        root.specialIDName = "Root";

        nodePaths[root.nodeID] = root.path;

        var tempID = "LM" + 0;

        root["specialID"] = tempID;  

        ///////////Sankey call path of LM////////////////////
        if(nodeArray[level] == null){
            nodeArray[level] = {};
            sanKeyMetricDataLM[level] = {};
            connectionInfo[level] = {};
        }
        nodeArray[level][tempID] = {
            "name" : "Root",
            "inTime" : 0,
            "exTime" : 0,
            "lmID" : 0,
            "procID" : 0,
            "myID" : sanKeyIDLM,
            "level" : level,
            "type" : "LM",
            "specialID" : tempID, 
            "uniqueID" : [],
        };
        sanKeyMetricDataLM[level][tempID] = [];
        // sanKeyMetricData[level]["root"].push(root.nodeID);
        sanKeyMetricDataLM[level][tempID].push({"nodeID": root.nodeID, "parentNodeID" : null, "nodeLevel" : level, "parentSpecialID" : null});   

        nodeArray[level][tempID]["uniqueID"].push(root.nodeID);

        connectionInfo[level][tempID] = [];

        sanKeyIDLM += 1;

        /////////////End/////////////////////////////////////        

        entryExitData[tempID] = {
            "name" : "root",
            "nodeIDs" : [], //an array to store the id of tree nodes
            "exit" : [], //array to store procedures that call proc from different lm
            "enter" : [] //array to store procs that was call from different lm
        }

        var nextLevel = level + 1;
        internalNodeList[root.nodeID] = root;
        xmlNode.childNodes().forEach(function(child){
            if(child.name() != "M")
                parseNodes(child, root, "false", nextLevel);
        })
    }  

    function parsePF(xmlNode, parentNode, Cid, level){
        var newNode = createNewNodeFromXML(xmlNode, "PF", level, parentNode);

        var nextLevel = level + 1;

        var getSpecialIDNameTypeRes = getSpecialIDNameType(newNode);
        var tempID = getSpecialIDNameTypeRes["specialID"];// = "LM" + newNode.loadModuleID;
        var type = getSpecialIDNameTypeRes["type"];
        var name = getSpecialIDNameTypeRes["name"];
        newNode["specialID"] = tempID;  
        newNode["specialIDName"] = name;
        internalNodeList[newNode.nodeID] = newNode;

        ////////lm callpath stuff//////////////////////
        createNewTreeLevel(level);

        createNewTreeNode(level, tempID, name, type, newNode);

        addInfo(level, tempID, newNode, parentNode);

        //////////////////End////////////////////////////////

		addEntryExitData(tempID, newNode, parentNode);

		if(parentNode["specialID"] == "CLM2" && newNode["specialID"] == "LM8"){
			var physicsFunc = procedureTable[parentNode.procedureID];
			var mirandaFunc = procedureTable[newNode.procedureID];

			var physicsFile = fileTable[parentNode["fileID"]];
			var mirandaFile = fileTable[newNode["fileID"]];
			var temp = {
				"physics funtion" : physicsFunc,
				"miranda function" : mirandaFunc,
				"physics file" : physicsFunc,
				"miranda file" : mirandaFile
			};
			// fs.appendFileSync("physicstomiranda", JSON.stringify(temp) + "\n");

		}

        xmlNode.childNodes().forEach(function(child){
            if(child.name() != "M"){
                parseNodes(child, newNode, "false", nextLevel);
            }
        })
    }

    function parseC(xmlNode, parentNode, level){
        xmlNode.childNodes().forEach(function(child){
            if(child.name() != "M"){
                parseNodes(child, parentNode, "true", level);
            }
        })
    }

    function parseLoop(xmlNode, parentNode, level){

        var newNode = createNewNodeFromXML(xmlNode, "Loop", level, parentNode);

        var getSpecialIDNameTypeRes = getSpecialIDNameType(newNode);
        var tempID = getSpecialIDNameTypeRes["specialID"];// = "LM" + newNode.loadModuleID;
        var type = getSpecialIDNameTypeRes["type"];
        var name = getSpecialIDNameTypeRes["name"];

        newNode["specialID"] = tempID;    
        newNode["specialIDName"] = name;
        internalNodeList[newNode.nodeID] = newNode;

        // ////////lm callpath stuff//////////////////////
        createNewTreeLevel(level);

        createNewTreeNode(level, tempID, name, type, newNode);

        addInfo(level, tempID, newNode, parentNode);         
        // //////////////////End////////////////////////////////


        var nextLevel = level + 1;
        xmlNode.childNodes().forEach(function(child){
            if(child.name() != "M"){
                parseNodes(child, newNode, "false", nextLevel);
            }
        })
    }

    function parseLine(xmlNode, parentNode, level){

        var newNode = createNewNodeFromXML(xmlNode, "Line", level, parentNode);

        var getSpecialIDNameTypeRes = getSpecialIDNameType(newNode);
        var tempID = getSpecialIDNameTypeRes["specialID"];// = "LM" + newNode.loadModuleID;
        var type = getSpecialIDNameTypeRes["type"];
        var name = getSpecialIDNameTypeRes["name"];

        newNode["specialID"] = tempID; 
        newNode["specialIDName"] = name; 
        internalNodeList[newNode.nodeID] = newNode;     

        // newNode.loadModuleID = currentLoadModID;


        ////////lm callpath stuff//////////////////////
        createNewTreeLevel(level);

        createNewTreeNode(level, tempID, name, type, newNode);

        addInfo(level, tempID, newNode, parentNode);            
        //////////////////End////////////////////////////////


        var nextLevel = level + 1;
        xmlNode.childNodes().forEach(function(child){
            if(child.name() != "M"){
                parseNodes(child, newNode, "false", nextLevel);
            }
        })
    }

    function parsePR(xmlNode, parentNode, level) {

        var newNode = createNewNodeFromXML(xmlNode, "PR", level, parentNode);

        var getSpecialIDNameTypeRes = getSpecialIDNameType(newNode);
        var tempID = getSpecialIDNameTypeRes["specialID"];// = "LM" + newNode.loadModuleID;
        var type = getSpecialIDNameTypeRes["type"];
        var name = getSpecialIDNameTypeRes["name"];

        newNode["specialID"] = tempID;    
        newNode["specialIDName"] = name;
        internalNodeList[newNode.nodeID] = newNode;

        ////////lm callpath stuff//////////////////////
        createNewTreeLevel(level);

        createNewTreeNode(level, tempID, name, type, newNode);

        addInfo(level, tempID, newNode, parentNode);       
        //////////////////End////////////////////////////////

		addEntryExitData(tempID, newNode, parentNode);

        var nextLevel = level + 1;;
        xmlNode.childNodes().forEach(function(child){
            if(child.name() != "M"){
                parseNodes(child, newNode, "false", nextLevel);
            }
        })
    }

    function parseNodes(xmlNode, parentNode, Cid, level){
        var xmlNodeName = xmlNode.name();
        // console.log(xmlNodeName);

        if(xmlNodeName == "SecCallPathProfileData" || 
            xmlNodeName == "PF" ||
            xmlNodeName == "C" ||
            xmlNodeName == "S" ||
            xmlNodeName == "L" ||
            xmlNodeName == "Pr"){
            // console.log(xmlNodeName);
            var nodeID;
            if(xmlNodeName == "SecCallPathProfileData"){
                nodeID = 1;
            }
            else{
                nodeID = parseInt(xmlNode.attr('i').value());
            }

            // console.log(nodeID, nodeKeep.indexOf(nodeID) > -1)

            if(nodeKeep.indexOf(nodeID) > -1 || xmlNodeName == "C"){
                if(xmlNodeName == "SecCallPathProfileData"){
                    counter++;
                    parseSecCallPathProfileData(xmlNode, level);
                }

                else if(xmlNodeName == "PF"){
                    counter++;
                    parsePF(xmlNode, parentNode, Cid, level);
                }

                else if(xmlNodeName == "C"){
                    // counter++;
                    parseC(xmlNode, parentNode, level);
                }

                else if(xmlNodeName == "S"){
                    counter++;
                    parseLine(xmlNode, parentNode, level);
                }

                else if(xmlNodeName == "L"){
                    counter++;
                    parseLoop(xmlNode, parentNode, level);
                }

                else if(xmlNodeName == "Pr"){
                    counter++;
                    parsePR(xmlNode, parentNode, level);
                }   
            } 

        }

    }   
    


    //this function create new node from the xml node
    function createNewNodeFromXML(xmlNode, type, level, parentNode){
    	var newNode = new Node();
    	newNode.nodeID = parseInt(xmlNode.attr('i').value());
    	newNode.Type = type;
    	newNode.parentID = parentNode.nodeID;
    	newNode.parentSpecialID = parentNode.specialID;
    	newNode.level = level;
    	newNode.path = parentNode.path + '*' + newNode.nodeID;
    	nodePaths[newNode.nodeID] = newNode.path;

    	if(type == "PF" || type == "PR"){
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
    	if(type == "PR"){
    		newNode.aType = parseInt(xmlNode.attr('a').value());
    	}

    	if(type == "Line"){
    		newNode.lineNumber = parseInt(xmlNode.attr('l').value());
        	// newNode.name = currentFileName + ": " + newNode.lineNumber;
        	// newNode.fileID = currentFileID;
        	// newNode.procedureID = currentprocedureID;   
            if(parentNode.fileID != null){
                newNode.fileID = parentNode.fileID;
            }    
            else{
                newNode.fileID = currentFileID;
            }	
            if(parentNode.procedureID != null){
                newNode.procedureID = parentNode.procedureID;

            }
            else{
                newNode.procedureID = currentprocedureID;
            }
            newNode.name = fileTable[newNode.fileID] + ": " + newNode.lineNumber;

    	}

    	if(type == "Loop"){
        	newNode.lineNumber = parseInt(xmlNode.attr('l').value());
            newNode.fileID = parseInt(xmlNode.attr('f').value());
        	newNode.name = "Loop at " + fileTable[newNode.fileID] + ": " + newNode.lineNumber;  
            if(parentNode.procedureID != null){
                newNode.procedureID = parentNode.procedureID;
            }
            else{
                newNode.procedureID = currentprocedureID;
            }

        	currentFileID = newNode.fileID; 
        	// newNode.procedureID = currentprocedureID;	
        	currentFileName = fileTable[newNode.fileID];	
    	}

    	if(type == "Loop" || type == "Line"){
	        if(parentNode.loadModuleID != null){
	            newNode.loadModuleID = parentNode.loadModuleID;
	        }
	        else{
	            newNode.loadModuleID = currentLoadModID;
	        } 

            newNode.oldLoadModuleID = newNode.loadModuleID;
    	}
    	return newNode;
    }



    //this function determine the specialID, name and type of the node
    function getSpecialIDNameType(node){
        var specialID;// = "LM" + newNode.loadModuleID;
        var type;
        var name;
        if(procIDArray.indexOf(node.procedureID) > -1){
            specialID = "PROC" + node.procedureID;
            type = "PROC";
            name = procedureTable[node.procedureID];

            if(procIDToLMIDMap[node.procedureID] == null){
                maxLMID += 1;
                procIDToLMIDMap[node.procedureID] = {
                    "newID" : maxLMID
                }

                loadModuleTable[maxLMID] = procedureTable[node.procedureID];
            }

            node.oldLoadModuleID = procIDToLMIDMap[node.procedureID]["newID"];

        }

        //this lm is the one we want to split based on the config file
        else if(lmIDToSplitConfig.indexOf(node.loadModuleID) >-1){
            //check for the file names

            //first get all the lm
            specialID = "LM" + node.loadModuleID;
            type = "LM";
            name = loadModuleTable[node.loadModuleID]

            //first set default for unknown file
            if(fileTable[node.fileID].includes("unknown file")){
                    specialID = "CLM" + node.loadModuleID + "-U";
                    type = "CLM";
                    name = loadModuleTable[node.loadModuleID] + "-unknown";             
            }

            //first check by file
            //This is where we try to figure out which load module the file should fall under
            var filePrefixes = configLMSplitInfo[node.loadModuleID]["files"];
            var fileName = fileIDTaleOrgName[node.fileID];
            var prefixLen = 0;
             filePrefixes.forEach(function(prefix){
                if(fileName.indexOf(prefix) > 0){
                    if(prefix.length > prefixLen) {
                        //get everything after the split
                        var afterPrefix = fileName.substr(fileName.indexOf(prefix) + prefix.length);

                        //now split the afterPrefix into parts seperate by the slash /
                        var splits = afterPrefix.split('/');
                        var loadModName = splits[0];

                        // if( prefix == "MILC/MILC7/generic_ks/" ){
                        //     console.log(splits);
                        // }

                        if(splits.length == 1){ //we end up with a file name, so we will use the last porttion of the prefix
                            var prefixSplit = prefix.split('/');
                            loadModName = prefixSplit[ prefixSplit.length - 2 ]; //skip the last one since it is after the / so 
                        }
                        else{
                            loadModName = splits[0];
                        }

                        //first get the original lm id;
                            if(splitLoadModuleFileID[node.loadModuleID][loadModName] == null){
                                maxLMID += 1;
                                splitLoadModuleFileID[node.loadModuleID][loadModName] = { "prefixID" : prefixID , "fileList" : [], "newID" : maxLMID};
                                prefixID += 1;
                                loadModuleTable[maxLMID] = loadModName;
                            }
                            specialID = "CLM" + splitLoadModuleFileID[node.loadModuleID][loadModName]["prefixID"];
                            type = "CLM";
                            name = loadModName;  
                            prefixLen = prefix.length;
                            node.oldLoadModuleID = splitLoadModuleFileID[node.loadModuleID][loadModName]["newID"];                
                    }
                }

            }); 

            /////////////////////////////////////

            //now search by functions
            var functionObjectList = Object.keys(configLMSplitInfo[node.loadModuleID]["functions"]);
            functionObjectList.forEach(function(functionToCheck){
                var functionNames = configLMSplitInfo[node.loadModuleID]["functions"][functionToCheck];
                functionNames.forEach(function(fName){
                    if( procedureTable[node.procedureID].includes(fName)){

                        if(splitLoadModuleFileID[node.loadModuleID][functionToCheck] == null){
                                maxLMID += 1;
                                splitLoadModuleFileID[node.loadModuleID][functionToCheck] = { "prefixID" : prefixID , "fileList" : [], "newID" : maxLMID};
                                prefixID += 1;
                                loadModuleTable[maxLMID] = functionToCheck;
                            }

                        specialID = "CLM" + splitLoadModuleFileID[node.loadModuleID][functionToCheck]["prefixID"];
                        type = "CLM";
                        name = functionToCheck;
                        node.oldLoadModuleID = splitLoadModuleFileID[node.loadModuleID][functionToCheck]["newID"];

                    }
                })
            })
        }

        else{
            specialID = "LM" + node.loadModuleID;
            type = "LM";
            name = loadModuleTable[node.loadModuleID];
        }   

        if(splitByParentList.indexOf(specialID) > -1){

        	if(internalNodeList[node.parentID].oldLoadModuleID != node.oldLoadModuleID){
	            specialID = "LM" + internalNodeList[node.parentID].oldLoadModuleID + "-" + "LM" + node.oldLoadModuleID;
            	type = "LM" + "-" + "LM";
            	name = loadModuleTable[ internalNodeList[node.parentID].oldLoadModuleID ] + "-" + loadModuleTable[node.oldLoadModuleID];
        	}
        	else{
        		nodePath = node["path"];
        		var nodePathID = nodePath.split('*');
        		nodePathID.pop();
        		nodePathID.sort(function(a,b){
        			return parseInt(b) - parseInt(a);
        		});
        		nodePathID.some(function(nodeID){
        			// console.log(nodeID, node.nodeID);

        			var parLMID = internalNodeList[ parseInt(nodeID) ].oldLoadModuleID;    			
        			if(parLMID != node.oldLoadModuleID){
        				specialID = "LM" + parLMID + "-" + "LM" + node.oldLoadModuleID;
        				type = "LM" + "-" + "LM";
        				name = loadModuleTable[ internalNodeList[parseInt(nodeID)].oldLoadModuleID ] + "-" + loadModuleTable[node.oldLoadModuleID];
        				return true;
        			}
        		})
        	} 

        }

        return {
        	"name" : name,
        	"specialID" : specialID,
        	"type" : type
        }; 	
    }

    //this create new tree level if needed
    function createNewTreeLevel(level){
		if(nodeArray[level] == null){
			nodeArray[level] = {};
			sanKeyMetricDataLM[level] = {};
			connectionInfo[level] = {};
		}       	
    }

    //this create new node if needed for the final tree
    function createNewTreeNode(level, specialID, name, type, node){
        if(nodeArray[level][specialID] == null){
            nodeArray[level][specialID] = {
                "name" : name,
                "inTime" : 0,
                "exTime" : 0,
                "lmID" : node.loadModuleID,
                "myID" : sanKeyIDLM,
                "specialID" : specialID,
                "type" : type,
                "parentSpecialID" : [],
                "level" : level,
                "uniqueID" : [],         
            };

            sanKeyIDLM += 1;

            sanKeyMetricDataLM[level][specialID] = [];
            connectionInfo[level][specialID] = [];
        }
    }

    //this add new info into the nodearray, sankeymetric, and connectionInfo
    function addInfo(level, specialID, node, parentNode){
        if(nodeArray[level][specialID]["uniqueID"].indexOf(node.nodeID) == -1){
            nodeArray[level][specialID]["uniqueID"].push(node.nodeID);
        }

        sanKeyMetricDataLM[level][specialID].push({"nodeID": node.nodeID, "parentLMID" : parentNode.loadModuleID, "parentNodeID" : parentNode.nodeID, "nodeLevel" : level, "parentProcID": parentNode.procedureID, "parentSpecialID" : parentNode.specialID});

		if(nodeArray[level][specialID].parentSpecialID.indexOf(parentNode["specialID"]) == -1){
			nodeArray[level][specialID].parentSpecialID.push(parentNode["specialID"]);
        }

        var tempTime = 0;

        nodeMetrics[node["nodeID"]]["inc"].forEach(function(val){
        	tempTime += val;
        })

        if(connectionInfo[level][node["specialID"]] != null){
        	var connectionNode = {
        		"parentNodeID" : parentNode["nodeID"],
        		"parentSpecialID" : parentNode["specialID"],
        		"parentProcedureName" : procedureTable[ parentNode["procedureID"] ],
        		"parentLoadModuleName" : parentNode["specialIDName"],
        		"nodeID" : node["nodeID"],
        		"specialID" : node["specialID"],
        		"procedureName" : procedureTable[ node["procedureID"] ],
        		"value" : tempTime,
        		"procID" : node["procedureID"],
                "type" : node.Type
        	};

        	connectionInfo[level][node["specialID"]].push(connectionNode);
        }
        else{
        	console.log("something is wrong, the current level is: " + level + ", the current specialID is: " + specialID + ", the parent specialID is: " + parentNode["specialID"] );
        }

        //////add node into its function list, only add if node type is PR or PF, ie function call
        if(node.Type == "PR" || node.Type == "PF"){

            if(functionList[node.specialID] == null){
                functionList[node.specialID] = {};
            }
            if(functionList[node.specialID][node.procedureID] == null){
                functionList[node.specialID][node.procedureID] = [];
            }
            functionList[node.specialID][node.procedureID].push(node.nodeID);
        }
    }

    //this function add in new information for the entry exit data
    function addEntryExitData(specialID, node, parentNode){
        if(entryExitData[specialID] == null){

            entryExitData[specialID] = {
                "name" : specialID,
                "exit" : [], //array to store procedures that call proc from different lm
                "enter" : [], //array to store procs that was call from different lm
                "entryNodeID" : {}
            }

        }

        //parent and current lmid are not the same
        //that mean we have a enter and exit
        if(specialID != parentNode["specialID"]){
            if(entryExitData[specialID]["enter"].indexOf(node.procedureID) == -1){
                entryExitData[specialID]["enter"].push(node.procedureID);
            }

            if(entryExitData[specialID]["entryNodeID"][node.procedureID] == null){
                entryExitData[specialID]["entryNodeID"][node.procedureID] = []
            }
            entryExitData[specialID]["entryNodeID"][node.procedureID].push(node.nodeID);

            if(entryExitData[parentNode["specialID"]]["exit"].indexOf(parentNode.procedureID) == -1){
                entryExitData[parentNode["specialID"]]["exit"].push(parentNode.procedureID);
            }
        }
    }


    // console.log("load module table", JSON.stringify(loadModuleTable));
    // console.log("load module table", JSON.stringify(splitLoadModuleFileID));
    

	var returnData = {
        "nodeArray" : nodeArray,
        "sanKeyMetricDataLM" : sanKeyMetricDataLM,
        "entryExitData" : entryExitData,
        "nodePaths" : nodePaths,
        "connectionInfo" : connectionInfo,
        "procedureTable" : procedureTable,
        "functionList" : functionList
	};

	callBack(returnData);    
}

module.exports = fileLoader;