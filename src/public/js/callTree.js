// Varius call tree operations
// Act as a wraper for the call tree vis

function CallTree (args){
	var containerID = args.ID || "body",
		containerWidth = args.width || 900,
		containerHeight = args.height || 900,
		margin = args.margin || {top: 10, right: 30, bottom: 10, left: 10},
		visType = args.vis || 0,	// 0 = node line, 1 = radio
		rank = args.treeRank || 0,
		callTreeCallBack = args.callback,
		colorBy = args.color || "exTime";

	var treeView; //the type of tree to display
	var ctData;
	var flatNodes = {};

	var threshold = -100;

	var treeHistory = []; //This is an array to store the history of displayed tree
	var curRootID = null; //This is the ID of the current root

	var calltree;

	var nodeScale = 1.0;

	function visualize(){
		$.ajax({
            type:'GET',
            contentType: 'application/json',
            dataType: 'json',
            url: '/data',
            data: {"threshold": threshold, "treeRank": rank},
            success: function(data){
            	console.log('hello');
            	console.log(data);
            	// ctData = data;
            	statistic = data['stat'];
            	ctData = data['treeData'];
            	flatNodes = data["flatnode"];

            	// console.log( JSON.parse(JSON.stringify(data['treeData'])) );

            	// ctData = JSON.parse(JSON.stringify(data['treeData']))
            	// render(data['treeData']);

            	renderTree();
            },
            error: function(){
            	console.log("There was problem with getting the data");
            }	
		})

	}

	function renderTree(){

		//one of the layout, could be both, seem to modify the data
		//to prevent this, make a deep copy of te data and pass it to the layouts
		var temp = JSON.parse(JSON.stringify( ctData ) );
		// console.log(temp);

		// console.log(ctData);

		//render node link
		// if(visType == 0){
		// 	calltree = new NodeLinkTree({
		// 			ID: containerID,
		// 			width : containerWidth,
		// 			height: containerHeight,
		// 			margin: margin,
		// 			stat: statistic,
		// 			data: temp,
		// 			color : colorBy
		// 		});  
		// }
		// //render radio
		// else if(visType == 1){
		// 	calltree = new RadioTree({
		// 			ID: containerID,
		// 			width : containerWidth,
		// 			height: containerHeight,
		// 			margin: margin,
		// 			stat: statistic,
		// 			data: temp,
		// 			color : colorBy
		// 		});  
		// }

				calltree = new HaloTree({
					ID: containerID,
					width : containerWidth,
					height: containerHeight,
					margin: margin,
					stat: statistic,
					data: temp,
					color : colorBy,
					flat: flatNodes,
					callback: callTreeCallBack,
					scale: nodeScale
				});  
	}

	//use to set the threshold and call the filternode function
	function setThreshold(value){
		console.log('inside the set threshold func');
		threshold = value;
		filterNode();
	}

	function filterNode(){
		$.ajax({
            type:'GET',
            contentType: 'application/json',
            dataType: 'json',
            url: '/filterNode',
            data: {"threshold": threshold},
            success: function(data){
            	console.log('inside filter');
            	console.log(data);
            	// ctData = data;
            	statistic = data['stat'];
            	ctData = data['treeData'];
            	flatNodes = data["flatnode"];

            	renderTree();
            },
            error: function(){
            	console.log("There was problem with getting the data");
            }	
		})
	}	

	function getSubTree(subtreeID){

		var nodeID = subtreeID;
		$.ajax({
            type:'GET',
            contentType: 'application/json',
            dataType: 'json',
            url: '/getSubTree',
            data: {"nodeID": nodeID},
            success: function(data){
            	console.log('inside filter');
            	console.log(data);
            	// ctData = data;
            	statistic = data['stat'];
            	ctData = data['treeData'];
            	flatNodes = data["flatnode"] || {};
            	// render(data['treeData']);
            	renderTree();
            },
            error: function(){
            	console.log("There was problem with getting the data");
            }	
		})		

	}

	function collapseTree(){
		$.ajax({
            type:'GET',
            contentType: 'application/json',
            dataType: 'json',
            url: '/collapseTree',
            success: function(data){
            	// console.log('inside filter');
            	console.log(data);
            	// ctData = data;
            	statistic = data['stat'];
            	ctData = data['treeData'];
            	// render(data['treeData']);
            	renderTree();
            },
            error: function(){
            	console.log("There was problem with getting the data");
            }	
		})			
	}

	function expandTree(){
		$.ajax({
            type:'GET',
            contentType: 'application/json',
            dataType: 'json',
            url: '/expandTree',
            success: function(data){
            	// console.log('inside filter');
            	console.log(data);
            	// ctData = data;
            	statistic = data['stat'];
            	ctData = data['treeData'];
            	// flatNodes = data["flatnode"] || {};
            	// render(data['treeData']);
            	renderTree();
            },
            error: function(){
            	console.log("There was problem with getting the data");
            }	
		})			
	}

	function showHotPath(nodeid){
		$.ajax({
            type:'GET',
            contentType: 'application/json',
            dataType: 'json',
            url: '/getHotPath',
            data: {"nodeID": nodeid},
            success: function(data){
            	console.log('inside show hotpath function');
            	console.log(data);
            	// ctData = data;
            	// render(data);
            	// renderHotPath(data);
            	calltree.hotPath(data);
            },
            error: function(){
            	console.log("There was problem with getting the data");
            }	
		})			
	}	

	function changeVis(vis){
		visType = vis;
		renderTree();
	}

	function changeColor(value){
		if(value == 0){
			colorBy = 'inTime';
		}
		else if(value == 1){
			colorBy = 'exTime';
		}
		else if(value == 2){
			colorBy = 'name';
		}
		else if(value == 3){
			colorBy = 'type';
		}
		else if(value == 4){
			colorBy = 'inStd';
		}
		else if(value == 5){
			colorBy = 'exStd';
		}		
		renderTree();
	}

	function recalcHist(treeids){
		$.ajax({
            type:'GET',
            contentType: 'application/json',
            dataType: 'json',
            url: '/recalcHist',
            data: {"treeIDs": treeids},
            success: function(data){
            	// console.log('inside show hotpath function');
            	// console.log(data);
            	statistic = data['stat'];
            	ctData = data['treeData'];
            	// render(data['treeData']);
            	flatNodes = data["flatnode"] || {};

            	console.log(ctData);

            	renderTree();
            },
            error: function(){
            	console.log("There was problem with getting the data");
            }	
		})			


	}

	////////////External methods that exposed to the outside////////////////////
	this.externalMethod = function(args){
		var option = args.option || "";
		var value = args.value || 0;

		if(option == "setThreshold"){
			console.log("setting the threshold");
			setThreshold(value);
		}
		else if(option == "collapseTree"){
			console.log('collapsing the tree');
			collapseTree();
		}
		else if(option == "expandTree"){
			console.log("expanding the tree");
			expandTree();
		}
		else if(option == "hotpath"){
			console.log('hotpath analysis');
			showHotPath(value);
		}
		else if(option == 'subtree'){
			console.log('getting the subtree');
			getSubTree(value);
		}
		else if(option == 'vistype'){
			console.log('changing the vis');
			changeVis(value);
		}
		else if(option == 'colorChange'){
			console.log('change the color');
			changeColor(value);
		}
		else if(option == 'recaclHistogram'){
			treeids = value;
			recalcHist(treeids);

		}
	}

	this.changeNodeScale = function(value){
		nodeScale = value;
		renderTree();
	}

	visualize();

}