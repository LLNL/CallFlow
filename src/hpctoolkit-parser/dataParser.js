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

var fs = require('fs');
var parser = require('libxmljs');


var dataFilePath = process.argv[2];//'../vis2017Data/miranda/2nodes/';

var xmlFile = dataFilePath + 'experiment.xml';
var mdbFiile = dataFilePath + 'experiment-1.mdb';
// var infoFile = dataFilePath + 'dataInfo.json';
var fileName = "nodeData.json";
// var dataInfo = require(infoFile);


var obj;


console.log('begin parsing file');
var xml = fs.readFileSync(xmlFile, 'utf8');
obj = parser.parseXmlString(xml, {noblanks: true});
console.log('finish parsing the file');

var fileTable = {}; //store the files names, access with file id
var loadModuleTable = {}; //store the load modules names, access with load module's id
var procedureTable = {}; //store the procedures names, access with procedure's id

var nodeMetric = {}; //use to store the runtime of each tree node, access with node's id



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
    })
}



function parseFileTable(xmlFileTableNode){
    xmlFileTableNode.childNodes().forEach(function(file){
        var id = parseInt(file.attr('i').value());
        var name = file.attr('n').value();
        // fileTable[id] = name;

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

//parsing the metrics table
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
    })

    console.log("the runtime metrics are: ", runtimeID);

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
console.log(cct.name());

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

parseNodes(cct, null, "false");

//parsing the root node
function parseSecCallPathProfileData(xmlNode){
    root = new Node();

    var name = "Experiment Aggregate Metrics";
    root.name = name;
    root.nodeID = 1;
    root.parentID = 1;
    root.Type = "Root";
    root.inc = [];
    root.exc = [];

    nodeMetric[root.nodeID] = root;

    // fs.appendFileSync("xmlParserResult.json", JSON.stringify(root) + "\n");

    xmlNode.childNodes().forEach(function(child){
        if(child.name() != "M")
            parseNodes(child, root, "false");
    })


}

//parsing PF nodes
function parsePF(xmlNode, parentNode, Cid){
    var newNode = new Node();

    newNode.nodeID = parseInt(xmlNode.attr('i').value());
    newNode.loadModuleID = parseInt(xmlNode.attr('lm').value());
    newNode.fileID = parseInt(xmlNode.attr('f').value());
    newNode.procedureID = parseInt(xmlNode.attr('n').value());
    newNode.name = procedureTable[newNode.procedureID];
    newNode.Type = "PF";
    newNode.parentID = parentNode.nodeID;
    newNode.inc = [];
    newNode.exc = [];

    currentFileID = newNode.fileID;
    currentLoadModID = newNode.loadModuleID;
    currentprocedureID = newNode.procedureID;
    currentFileName = fileTable[newNode.fileID];

    //add this node id to get the metric later
    nodeMetric[newNode.nodeID] = newNode;
    

    // fs.appendFileSync("xmlParserResult.json", JSON.stringify(newNode) + "\n");

    //recursively parsing the children nodes
    xmlNode.childNodes().forEach(function(child){
        if(child.name() != "M"){
            parseNodes(child, newNode, "false");
        }
    })

    //add the new node into the children of the parent's node
    //to create a tree hierarchy
    // parentNode.children.push(newNode);
}

//Parse all C node,
//since this node give no information except to determine call site,
//it is not needed
function parseC(xmlNode, parentNode){
    currentCallSiteID = parseInt(xmlNode.attr('i').value());


    xmlNode.childNodes().forEach(function(child){
        if(child.name() != "M"){
            parseNodes(child, parentNode, "true");
        }
    })
}

//parse loop nodes
function parseLoop(xmlNode, parentNode){
    var newNode = new Node();

    newNode.nodeID = parseInt(xmlNode.attr('i').value());

    newNode.fileID = parseInt(xmlNode.attr('f').value());
    newNode.lineNumber = parseInt(xmlNode.attr('l').value());
    newNode.name = "Loop at " + fileTable[newNode.fileID] + ": " + newNode.lineNumber;
    newNode.Type = "Loop";
    newNode.parentID = parentNode.nodeID;
    newNode.inc = [];
    newNode.exc = [];
    currentFileName = fileTable[newNode.fileID];
    currentFileID = newNode.fileID;

    //since the loop node doesn't contain the load module info
    //use the parent's load module for this node
    if(parentNode.loadModuleID != null){
        newNode.loadModuleID = parentNode.loadModuleID;
    }
    else{
        newNode.loadModuleID = currentLoadModID;
    }

    //same for procedure id
    if(parentNode.procedureID != null){
        newNode.procedureID = parentNode.procedureID;
    }
    else{
        newNode.procedureID = currentprocedureID;
    }
    

   nodeMetric[newNode.nodeID] = newNode;

    // fs.appendFileSync("xmlParserResult.json", JSON.stringify(newNode) + "\n");

    xmlNode.childNodes().forEach(function(child){
        if(child.name() != "M"){
            parseNodes(child, newNode, "false");
        }
    })

    // parentNode.children.push(newNode);
}

//parse line nodes
function parseLine(xmlNode, parentNode){
    var newNode = new Node();

    newNode.nodeID = parseInt(xmlNode.attr('i').value());

    newNode.lineNumber = parseInt(xmlNode.attr('l').value());
    newNode.name = currentFileName + ": " + newNode.lineNumber;
    newNode.Type = "Line";
    newNode.parentID = parentNode.nodeID;
    newNode.inc = [];
    newNode.exc = [];
    //since the loop node doesn't contain the load module info
    //use the parent's load module for this node
    if(parentNode.loadModuleID != null){
        newNode.loadModuleID = parentNode.loadModuleID;
    }
    else{
        newNode.loadModuleID = currentLoadModID;
    }

    //same for procedure id
    if(parentNode.procedureID != null){
        newNode.procedureID = parentNode.procedureID;
    }
    else{
        newNode.procedureID = currentprocedureID;
    }   
    
     //same for file id
    if(parentNode.fileID != null){
        newNode.fileID = parentNode.fileID;
    }
    else{
        newNode.fileID = fileID;
    }       

    nodeMetric[newNode.nodeID] = newNode;

    // fs.appendFileSync("xmlParserResult.json", JSON.stringify(newNode) + "\n");

    xmlNode.childNodes().forEach(function(child){
        if(child.name() != "M"){
            parseNodes(child, parentNode, "false");
        }
    })
}

//parse PR nodes
function parsePR(xmlNode, parentNode) {
    var newNode = new Node();

    newNode.nodeID = parseInt(xmlNode.attr('i').value());
    newNode.loadModuleID = parseInt(xmlNode.attr('lm').value());
    newNode.fileID = parseInt(xmlNode.attr('f').value());
    newNode.procedureID = parseInt(xmlNode.attr('n').value());
    newNode.name = procedureTable[newNode.procedureID];
    newNode.Type = "PR";
    newNode.parentID = parentNode.nodeID;
    newNode.aType = parseInt(xmlNode.attr('a').value());
    // newNode.level = level;
    newNode.inc = [];
    newNode.exc = [];

    currentFileID = newNode.fileID;
    currentLoadModID = newNode.loadModuleID;
    currentprocedureID = newNode.procedureID;

    nodeMetric[newNode.nodeID] = newNode;

    // fs.appendFileSync("xmlParserResult.json", JSON.stringify(newNode) + "\n");

    xmlNode.childNodes().forEach(function(child){
        if(child.name() != "M"){
            parseNodes(child, newNode, "false");
        }
    })


}

//recursively call this function to parse the xml nodes
function parseNodes(xmlNode, parentNode, Cid){
    var xmlNodeName = xmlNode.name();

    if(xmlNodeName == "SecCallPathProfileData"){
        counter++;
        parseSecCallPathProfileData(xmlNode);
    }

    else if(xmlNodeName == "PF"){
        counter++;
        parsePF(xmlNode, parentNode, Cid);
    }

    else if(xmlNodeName == "C"){
        // counter++;
        parseC(xmlNode, parentNode);
    }

    else if(xmlNodeName == "S"){
        counter++;
        parseLine(xmlNode, parentNode);
    }

    else if(xmlNodeName == "L"){
        counter++;
        parseLoop(xmlNode, parentNode);
    }

    else if(xmlNodeName == "Pr"){
        counter++;
        parsePR(xmlNode, parentNode);
    }        

}

//after finish with read the xml nodes
//parse the runtime data

var offsets = []; //this store the offset in the .mdb file to get the appropriate runtime metric for each node

fs.open(mdbFiile, 'r', function(err, fd){
  if(err){
        throw err;
    }

    var buffer = new Buffer(4);
    //this is the type of file
    var num = fs.readSync(fd, buffer, 0, 4, null);
  console.log("number ", num);
  // console.log(buffer[0]);
  // console.log(buffer.toString('utf8'), num);
    console.log(buffer.readUIntBE(0, 4));

    //this is the number of data files
    num = fs.readSync(fd, buffer, 0, 4, null);
    var numbOfFiles = buffer.readUIntBE(0, 4)
  console.log(numbOfFiles);

    //getting the proc-id, thread-id, and offset
    for(var i = 0; i < num; i++) {
        buffer = new Buffer(4);
        num = fs.readSync(fd, buffer, 0, 4, null);
//         console.log("proc-id", buffer.readUIntBE(0, 4));
        num = fs.readSync(fd, buffer, 0, 4, null);
//      console.log("thread-id", buffer.readUIntBE(0, 4));

        buffer = new Buffer(8);
        num = fs.readSync(fd, buffer, 0, 8, null);
        var offset = buffer.readUIntBE(0, 8);
        offsets.push(offset);
        // console.log("offset", offset);
        // console.log("/n");
//      console.log(i, numbOfFiles);
    }


    /////////////////////reading the contents of the data files/////////////


    buffer = new Buffer(8);


    var nodeID = Object.keys(nodeMetric); //get the node id

    // var numbOfMetrics = dataInfo.numberOfMetric; //this is the number of metrics, this can derive from the xml file but I haven't get to that yet so hardcode for now
    var numbOfMetrics = 2;

    //reading the inclusive runtime
    // var myMetricID = dataInfo.inclusiveID;

  console.log("begin reading the data file");
  // var incMetricID = dataInfo.inclusiveID;
  var incMetricID = 0;
  // var excMetricID = dataInfo.exclusiveID;
  var excMetricID = 1;
  nodeID.forEach(function(id){
    console.log(id);
    var myID = parseInt(id) - 1;
    var filePosInc = (myID * numbOfMetrics * 8) + (incMetricID * 8) + 32;
    var filePosExc = (myID * numbOfMetrics * 8) + (excMetricID * 8) + 32;
    
    var incArray = [];
    var excArray = [];
    offsets.forEach(function(offset, idx){
      
      var num = fs.readSync(fd, buffer, 0, 8, offset + filePosInc);
      var value = parseFloat(buffer.readDoubleBE(0));
      // console.log(value);
      // nodeMetric[id]["inc"].push(value);
      incArray.push(value);

      var excNum = fs.readSync(fd, buffer, 0, 8, offset + filePosExc);
      var excValue = parseFloat(buffer.readDoubleBE(0));
      // nodeMetric[id]["exc"].push(excValue);
      excArray.push(excValue);

      // if(id == 1){
      //     console.log(value);
      // }
      
    })

    // if(id == 1){
    //     console.log(JSON.stringify(nodeMetric[id]));
    // }        

    // var tempObj = JSON.parse(JSON.stringify(nodeMetric[id]));
    // tempObj["inc"] = incArray;
    // tempObj["exc"] = excArray;

    var tempObj = {
      "id": nodeMetric[id].nodeID,
      "inc" : incArray,
      "exc" : excArray
    }

    // fs.appendFileSync(dataFilePath + "nodeData.json", JSON.stringify(nodeMetric[id]) + "\n");    
    fs.appendFileSync(dataFilePath + fileName, JSON.stringify(tempObj) + "\n");    

  })


  console.log('finish reading the data file');
})
