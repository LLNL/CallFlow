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

		String.prototype.trunc = String.prototype.trunc ||
	      function(n){
	          return (this.length > n) ? this.substr(0, n-1) + '...' : this;
	      };

		Array.prototype.SumArray = function (arr) {
		    var sum = [];
		    if (arr != null && this.length == arr.length) {
		        for (var i = 0; i < arr.length; i++) {
		            sum.push(this[i] + arr[i]);
		        }
		    }

		    return sum;
		}

		$("#main_container").width( $(window).width() - 10);
		$("#main_container").height( $(window).height() - $("#nav_bar").height() - 30);

		var ids = [];

		var opts = {
			lines: 13 // The number of lines to draw
			, length: 28 // The length of each line
			, width: 14 // The line thickness
			, radius: 42 // The radius of the inner circle
			, scale: 1 // Scales overall size of the spinner
			, corners: 1 // Corner roundness (0..1)
			, color: '#000' // #rgb or #rrggbb or array of colors
			, opacity: 0.25 // Opacity of the lines
			, rotate: 0 // The rotation offset
			, direction: 1 // 1: clockwise, -1: counterclockwise
			, speed: 1 // Rounds per second
			, trail: 60 // Afterglow percentage
			, fps: 20 // Frames per second when using setTimeout() as a fallback for CSS
			, zIndex: 2e9 // The z-index (defaults to 2000000000)
			, className: 'spinner' // The CSS class to assign to the spinner
			, top: '50%' // Top position relative to parent
			, left: '50%' // Left position relative to parent
			, shadow: false // Whether to render a shadow
			, hwaccel: false // Whether to use hardware acceleration
			, position: 'absolute' // Element positioning
		}

		var spinner;
		var target;

		//configuration for the layout of the page
		var config = {
			settings: {
				showCloseIcon : false,
			    showPopoutIcon : false,
			    reorderEnabled : false
			},


			content: [{
				type: 'row',
				content: [
					{
						type: 'column',
						width: $(window).width() * 25,
						content: [
							// {

							// 	type: 'component',
							// 	componentName: 'testComponent',
							// 	// id: 'control',
							// 	componentState: {id : "control" },
							// 	isClosable: false,
							// 	title: "Control"								
							// },
							// {

							// 	type: 'component',
							// 	componentName: 'testComponent',
							// 	// id: 'control',
							// 	componentState: {id : "stat_view" },
							// 	isClosable: false,
							// 	title: "Statistic View"								
							// },
							{
								type: 'stack',
								content: [

								{

									type: 'component',
									componentName: 'testComponent',
									// id: 'control',
									componentState: {id : "control" },
									isClosable: false,
									title: "Control"								
								},								
								{
									type: 'component',
									componentName: 'testComponent',
									componentState: {id : "info_view" },
									isClosable: false,
									title: "Node Info"
								},								
								// {
								// 	type: 'component',
								// 	componentName: 'testComponent',
								// 	componentState: {id : "hist_view" },
								// 	isClosable: false,
								// 	title: "Histogram View"
								// },
								{
									type: 'component',
									componentName: 'testComponent',
									componentState: {id : "scat_view" },
									isClosable: false,
									title: "Scatter Plot View"
								},
								{
									type: 'component',
									componentName: 'testComponent',
									componentState: {id : "fList_view" },
									isClosable: false,
									title: "Function List"
								},								
								]
							},
							{

								// type: 'component',
								// componentName: 'testComponent',
								// // id: 'control',
								// componentState: {id : "lm_view" },
								// isClosable: false,
								// title: "LM View"		

									type: 'component',
									componentName: 'testComponent',
									componentState: {id : "hist_view" },
									isClosable: false,
									title: "Histogram View"														
							}
						]
					},
					{
						type: 'column',
						width: $(window).width() * 70,
						content: [
							{
								type: 'component',
								componentName: 'testComponent',
								componentState: { id: 'procedure_view' },
								title: 'Graph View'
							}
						]
						
					}
				]
			}]			
		}

		var myLayout = new GoldenLayout( config , $("#main_container"));
		myLayout.registerComponent( 'testComponent', function( container, state ){
			// console.log(state.id);
			container.getElement().html( "<div id = " + state.id + " > </div>" );

			// donewithlayout();
			ids.push(state.id);
		});

		myLayout.on("initialised", donewithlayout);

		myLayout.on('stateChanged', function(component){
			updateDivSizes();
		})
		myLayout.init();

		function updateDivSizes(){
			ids.forEach(function(myid){
				$("#" + myid).width( $("#" + myid).parent().width() );
				$("#" + myid).height( $("#" + myid).parent().height() );
			})		

			if(sankeyVis){
				// console.log(d3.select("#procedure_view svg"));
				// d3.select("#procedure_view svg")
				// 	.attr("width", $("#procedure_view").width() )
				// 	.attr("height", $("#procedure_view").height() )

				sankeyVis.updateSize({'width' : $("#procedure_view").width(),
									  'height' : $("#procedure_view").height() })



			}	

			if(scatterPot){
				scatterPot.setContainerWidth( $("#scat_view").width() );
				scatterPot.setContainerHeight( $("#scat_view").height() );
				scatterPot.reDraw();
			}
			if(histogram){
				histogram.setContainerWidth( $("#hist_view").width() );
				histogram.setContainerHeight( $("#hist_view").height() );
				histogram.reDraw();

			}

			$("#list_view").width( $("#fList_view").width() );
			$("#list_view").height( $("#fList_view").height() - 50 );
			if(listData){
				displayList();
			}

		}

		function initializeControlView(){

			var label = document.createElement("label");
			var description = document.createTextNode('Show Name: ');
			var checkbox = document.createElement("input");
			
			checkbox.type = "checkbox";
			// checkbox.name = dat["name"];
			// checkbox.value = dat["procID"];
			checkbox.setAttribute('id', "showLabelBox");

			label.appendChild(description);
			label.appendChild(checkbox);

			document.getElementById('control').appendChild(label);

			$('#showLabelBox').attr('checked',false);


			//create a dropdown to select color option
			var dropDownData = {
			    '0': 'Name',
			    '1': 'Inclusive Runtime',
			    '2': 'Exclusive Runtime',
			    '3': 'Range/Avg',
			    '4': 'Difference'
			}

			var $label = $("<label>").text('Color By: ');

			var s = $('<select name="colorDropDown"  id = "colorDropDown" onchange = "colorDropDownChange()" />');
			for(var val in dropDownData) {
			    $('<option />', {value: val, text: dropDownData[val]}).appendTo(s);
			}

			var temp = document.createElement('div');
			temp.setAttribute("id", "dropDown");
			$('#control').append(temp);
			s.appendTo($label);
			$('#dropDown').append($label);

			var $metricLabel = $("<label>").text('Metric Color:');
			$('#control').append($metricLabel);

			temp = document.createElement('div');
			temp.setAttribute("id", "metricColorScale");
			// $("#metricColorScale").css({left: 200});
			$('#control').append(temp);

			// var w = 200, h = 70;
			// var colorScaleHeight = 30
			// var nodeRunTimeColorScale = 'OrRd';

			// var spanColor = chroma.scale(nodeRunTimeColorScale).padding([0.2, 0]).domain([0,99]);

			// // console.log(spanColor(1));

			// var timeScaleDiv = document.getElementById('metricColorScale');
			// $("#metricColorScale").width(200);
			// $("#metricColorScale").height(h);
			// for(var i = 0 ; i < 100; i++){
			// 	// nodeRunData.push(i);
			// 	var newSpan = document.createElement('span');
			// 	newSpan.style.backgroundColor = spanColor(i);
			// 	newSpan.style.display = 'inline-block';
			// 	newSpan.style.height = colorScaleHeight + 'px';
			// 	newSpan.style.width = '1%';
			// 	timeScaleDiv.appendChild(newSpan);
			// }

			// var fastSpan = document.createElement('span');
			// fastSpan.style.position = "relative";
			// fastSpan.style.left = "0";
			// fastSpan.style.fontSize = "15px";
			// fastSpan.style.fontFamily = "sans-serif";
			// fastSpan.style.top = "5px";
			// fastSpan.innerHTML = "low";
			// fastSpan.setAttribute("id", "slowAttr");
			// timeScaleDiv.appendChild(fastSpan);

			// var slowSpan = document.createElement('span');
			// slowSpan.style.position = "absolute";
			// // slowSpan.style.left = "140";
			// slowSpan.style.left = "190";
			// slowSpan.style.fontSize = "15px";
			// slowSpan.style.fontFamily = "sans-serif";
			// slowSpan.style.top = $("#metricColorScale").position().top + colorScaleHeight + 10;// + 5;
			// slowSpan.innerHTML = "high";
			// slowSpan.setAttribute("id", "fastAttr");


			// timeScaleDiv.appendChild(slowSpan);

			colorScaleLegend(0);

			var $rangeLable = $("<label>").text('Set Range:');
			$('#control').append($rangeLable);
			temp = document.createElement('div');
			temp.setAttribute("id", "setRange");
			$('#control').append(temp);
			 $('<p><label for="minVal"> Min Value:  <input type="text" id="minVal" size="12" name="minVal" value="" placeholder="Input Value" /></label></p>').appendTo(temp);
			 $('<p><label for="maxVal"> Max Value: <input type="text" id="maxVal" size="12" name="maxVal" value="" placeholder="Input Value" /></label></p>').appendTo(temp);

			 var tButton=$('<input/>').attr({
			        type: "button",
			        id: "setRangeBtr",
			        value: 'Set Range'
			    });
			 tButton.appendTo(temp);

		}

		function donewithlayout(){
			updateDivSizes();
			// getData();


			initializeControlView();


			var temp = document.createElement('div');
			temp.setAttribute("id", "list_view");

			document.getElementById('fList_view').appendChild(temp);

			$("#list_view").width( $("#fList_view").width() );
			$("#list_view").height( $("#fList_view").height() - 50 );
			$("#list_view").css("overflow", "auto");

			var button = $('<button/>',
						    {
						        text: 'Split Node',
						        click: splitNode2,
						        id: "splitNodeBtr"
						    });
			$("#fList_view").append(button);
			document.getElementById("splitNodeBtr").disabled = true;

			var button2 = $('<button/>',
						    {
						        text: 'Split By Parents',
						        click: splitNodeByParents,
						        id: "splitNodeByParentBtr"
						    });
			$("#fList_view").append(button2);
			document.getElementById("splitNodeByParentBtr").disabled = true;

			var parentOfSankeyView =  document.getElementById("procedure_view").parentElement;

			target = parentOfSankeyView;
			spinner = new Spinner(opts).spin(parentOfSankeyView);
			spinner.stop();
			startVis();
			
		}
		
		var rectWidth = 20;
		var rectHeight = 20;

		var visData;

		var minVal;
		var maxVal;

		var numbOfClusters = 16; //this is the number of clusters

		var lmView;
		var sankeyVis;

		var selectedLMID;

		var scatterPot;
		var histogram;

		var listData;

		var sankColor;

		var edges;
		var nodes;
		var edgeList;
    	var nodeList;
    	var connectionList;

		var currentClickNode;
		var nodeMetrics;

		//this is the data use for the histogram and scatter plot
		var sankNodeDataHistScat = {};

		var sankeyScale;

		var specialIDToSankIDMap = {};
		var currentMaxID = 0;

		var globalNodes;
		var globalEdges;

		var rootRunTime = 0;

		var showLabelBool = false;

		var dataSetInfo;

		function startVis(){

			$("#control").css(
				"padding","5px"
			);

			// getNodeMetrics();
			getDataSetInfo();
			getSankey(0);
		}

		function lmCallBack(lmID){
			selectedLMID = lmID;

		}

		function getDataStat(){
			var min = Number.MAX_SAFE_INTEGER;
			var max = 0;

			Object.keys(visData).forEach(function(rowid){
				visData[rowid].forEach(function(dat){
					min = Math.min(min, dat.value);
					max = Math.max(max, dat.value);
				})
			});

			minVal = min;
			maxVal = max;
		}

		function getDataSetInfo(){
			$.ajax({
	            type:'GET',
	            contentType: 'application/json',
	            dataType: 'json',
	            url: '/dataSetInfo',
	            success: function(datInfo){
	            	dataSetInfo = datInfo;

	            },
	            error: function(){
	            	console.log("There was problem with getting the metric data");
	            }	
			});				
		}

		function getNodeMetrics(){
			// $.ajax({
	  //           type:'GET',
	  //           contentType: 'application/json',
	  //           dataType: 'json',
	  //           url: '/getNodeMetrics',
	  //           success: function(metricData){
	  //           	nodeMetrics = metricData;
	  //           },
	  //           error: function(){
	  //           	console.log("There was problem with getting the metric data");
	  //           }	
			// });				
		}

		function getSankey(lmID){
			$.ajax({
	            type:'GET',
	            contentType: 'application/json',
	            dataType: 'json',
	            url: '/getSankey',
	            data: {"lmID" : lmID},
	            success: function(newData){
	                //somecoment
	            	// console.log(newData);
	            	console.log('done with getting data');
	            	var data = newData["graph"];
	            	var histogramData = newData["histogramData"];
	            	var offSet = 0;
	            	nodes = data["nodes"];
	            	edges = data["edges"];
	            	var myNodes = [];

	            	var idMap = {};

	            	var labelList = Object.keys(nodes);
	            	labelList.forEach(function(lab){
	            		var tempObj = nodes[lab];
	            		myNodes.push(tempObj);
	            		idMap[ myNodes.sankeyID ] = 0;
	            		specialIDToSankIDMap[lab] = tempObj["sankeyID"];
        				currentMaxID = Math.max(currentMaxID, tempObj["sankeyID"]);
	            	});

    				globalNodes = myNodes;
					globalEdges = edges;
					// console.log(myNodes);
					myNodes.sort(function(a,b){
						return a['sankeyID'] - b["sankeyID"];
					})
					edges.sort(function(a,b){
						return a["sourceID"] - b["targetID"];
					})

					edges.forEach(function(edge){
						// console.log(edge["sourceLabel"] );
						if(edge["sourceLabel"] == "LM0" || parseInt(edge["sourceLabel"]) == 0){
							rootRunTime += edge["value"];
						}
					})

	            	edgeList = data["edgeList"];
	            	nodeList = data["nodeList"];
	            	connectionList = data["connInfo"];

	            	// console.log(myNodes);

					// console.log(myNodes);
					$('#procedure_view').empty();
					sankeyVis = new Sankey({
						ID: "#procedure_view",
						width: $("#procedure_view").width(),
						height: $("#procedure_view").height(),
						// width: width,
						// height: height,
						margin: {top: 10, right: 10, bottom: 10, left: 10},
						data: {"nodes": myNodes, "links": edges},
						toolTipData : {"edgeList" : edgeList, "nodeList": nodeList, "connInfo" : connectionList},
						histogramData : histogramData,
						// spinner: spinner,
						clickCallBack: nodeClickCallBack
					})	

					// sankColor = sankeyVis.colorScale;				

					if(showLabelBool == true){
						d3.selectAll('.node text').style('opacity', 1);
					}
					else{
						d3.selectAll('.node text').style('opacity', 0);
					}
					
					// console.log('done with layout');

					// console.log(histogramData);
	            },
	            error: function(){
	            	console.log("There was problem with getting the data");
	            }	
			});				
		}
		// getData();

		function showScatterPlot(){
			var width = $("#scat_view").parent().width();
			var height = $("#scat_view").parent().height();
			var runTimeLable;
			var scatDat;

			$('#scat_view').empty();
			scatterPot = new Scatter({
				ID: "#scat_view",
				width: width,
				height: height,
				margin: {top: 10, right: 10, bottom: 30, left: 44},
				yData: sankNodeDataHistScat["inc"].slice(),
				xData: sankNodeDataHistScat["exc"].slice(),
				sort: false						
			})			

		}

		// function showHistogram(node){
		function showHistogram(){

			$("#hist_view").empty();
			var width = $("#hist_view").parent().width();
			var height = $("#hist_view").parent().height();
			histogram = new Histogram({
				ID: "#hist_view",
				width: width,
				height: height,
				margin: {top: 10, right: 10, bottom: 30, left: 40},
				data: sankNodeDataHistScat["inc"].slice(),
				numbOfBins : 20,
				brushCallBack: brushCallBack,
				clickCallBack: nodeClickCallBack						
			})	
		}

		function nodeClickCallBack(res){
			$("#info_view").empty();

			// console.log(res);

			var node = res["node"];
			var fromProcToProc = res["fromProcToProc"];
			var nodeInfo = d3.select("#info_view")
				.append('p');

			nodeInfo.html(
				"Name : " + node.name +
				"<br> Incoming: " + node['in'] + 
				"<br> Outgoing: " + node["out"] + 
				// "<br> Imbalance Percent: " + (node["imPerc"] * 100).toFixed(2) + "%"
				""
				);

			var uniqueNodeIDList = node["uniqueNodeID"];
			getHistogramScatterData(node);

			var tempList = {};
			var nameToIDMap = res["nameToIDMap"];
			fromProcToProc.forEach(function(fromTo){
				var funcName = fromTo["toProc"];
				// console.log(fromTo);
				if(tempList[funcName] == null){
					tempList[funcName] = {"name" : funcName, "value" : 0, "procID" : nameToIDMap[funcName]};
				}
				tempList[funcName]["value"] += fromTo["value"];
			});

			console.log(tempList);

			getList(node);


			var parentProcList = {};
			
			fromProcToProc.forEach(function(fromTo){
				var parentLabel = fromTo["fromLM"];

				if(parentProcList[parentLabel] == null){
					parentProcList[parentLabel] = [];
				}
				var funcName = fromTo["toProc"];
				// console.log(funcName);
				var procID = nameToIDMap[funcName];
				if(parentProcList[parentLabel].indexOf(procID) == -1){
					parentProcList[parentLabel].push(procID);
				}
			});
			// console.log("proc ids by parent are,", parentProcList, node.name);
			// console.log(node.specialID);
			currentClickNode = {"nodeLabel" : node.name, "nodeSpecialID" : node.specialID};
			document.getElementById("splitNodeByParentBtr").disabled = false;
			// splitNodeByParents(parentProcList, node.name);
		}

		function getList(node){
			$.ajax({
	            type:'GET',
	            contentType: 'application/json',
	            dataType: 'json',
	            url: '/getLists',
	            data: {"specialID" : node["specialID"]},
	            success: function(procedureListData){

	            	// console.log("done with getting list of functions");

					listData = [];

					var procIDs = Object.keys(procedureListData);
					procIDs.forEach(function(procedureID){
						if(procedureListData[procedureID]['value'] >= rootRunTime * (1/100)){
							listData.push(procedureListData[procedureID]);
						}
					})

	            	// listData = newData;
	            	displayList();
	            },
	            error: function(){
	            	console.log("There was problem with getting the data");
	            }	
			});				
		}

		function displayList(){
        	$('#list_view').empty();
        	// console.log(listData);
        	listData.sort(function(a,b){
        		return b["value"] - a["value"];
        	})
        	console.log(listData);
        	listData.forEach(function(dat){
        		// console.log(dat);
				// create the necessary elements
				var funcName = dat["name"].trunc(20) + ": [" + (dat["value"] * 0.000001).toFixed(3)  + "s, " + (dat["value"] /rootRunTime * 100).toFixed(3) + "%]" ;
				var label = document.createElement("label");
				var description = document.createTextNode(funcName);
				var checkbox = document.createElement("input");

				checkbox.type = "checkbox";
				
				checkbox.name = funcName;
				checkbox.value = dat["procID"];
				checkbox.setAttribute('class', "list_checkbox");

				label.appendChild(checkbox);
				label.appendChild(description);

				document.getElementById('list_view').appendChild(label);
				document.getElementById('list_view').appendChild(document.createElement("br"));  
        	});

        	document.getElementById("splitNodeBtr").disabled = false;

		}

		function getScatter(node){
			$.ajax({
				type:'GET',
				contentType: 'application/json',
				dataType: 'json',
				url: '/getRuntimeOfNode',
				data: {"nodeID" : node.myID, "specialID" : node.specialID , "nodeLevel" : node.oldLevel, "lmID" : selectedLMID, "offset": (node.oldLevel - node.level), "name" : node.name},
				success: function(runTimes){

					scatterData = runTimes;

					showScatterPlot();
					showHistogram();


				},
				error: function(){
					console.log("There was problem with getting the data");
				}	
			});				
		}

		function getHistogramScatterData(node){
			var sankeyID = node["sankeyID"];
			var specialID = node["specialID"];
			$.ajax({
	            type:'GET',
	            contentType: 'application/json',
	            dataType: 'json',
	            url: '/getHistogramScatterData',
	            data: {"sankeyID" : sankeyID, "specialID" : specialID},
	            success: function(histScatData){
	            	sankNodeDataHistScat = {"exc" : histScatData["exc"], "inc" : histScatData["inc"]};
    				showHistogram();
					showScatterPlot();

	            },
	            error: function(){
	            	console.log("There was problem with getting the data for histogram and scatter plot");
	            }	
			});	

		}

		function splitNode(){
			var idList = $('input:checkbox:checked.list_checkbox').map(function () {
			  return parseInt(this.value);
			}).get();


			spinner.spin(target);
			$.ajax({
	            type:'GET',
	            contentType: 'application/json',
	            dataType: 'json',
	            url: '/splitNode',
	            data: {"idList" :  idList},
	            success: function(newData){
					
	            	var data = newData;
	            	var offSet = 0;
	            	var nodes = data["nodes"];
	            	var edges = data["edges"];
	            	var myNodes = [];



	            	var levelOffSet = 0;

	            	var maxLevel = {};

	            	var tempNodes = {};

					var treeLevel = Object.keys(nodes);
					treeLevel.forEach(function(myLevel){
						var myLM = Object.keys(nodes[myLevel]);

						if(myLM.length == 0){
							levelOffSet += 1;
						}

						myLM.forEach(function(loadMod){

							var tempObj = nodes[myLevel][loadMod];
							tempObj.oldLevel = tempObj.level;
							tempObj.level = tempObj.level - levelOffSet;

							if(maxLevel[loadMod] == null){
								maxLevel[loadMod] = 0;
							}

							maxLevel[loadMod] = Math.max(maxLevel[loadMod], tempObj.level);

							tempNodes[loadMod] = tempObj;

							myNodes.push(tempObj);
						})
					});

					var lmNodes = Object.keys(tempNodes);
					//refinement
					for(var i = 0; i < 20; i++){
						lmNodes.forEach(function(lmN){
							var parents = tempNodes[lmN]["parentLMProcID"];
							if(parents){
								var lvl = 0;
								parents.forEach(function(par){
									if(maxLevel[par] != null){
										lvl = Math.max( lvl, maxLevel[par] );
									}
								});

								var newLevel = lvl + 1;
								tempNodes[lmN].level = newLevel;
								if(maxLevel[lmN]){
									maxLevel[lmN] = newLevel;
								}
							}

						})
					}					

					myNodes = [];
					lmNodes.forEach(function(lmN){
						// var parents = tempNodes[lmN]["parentLMProcID"];
						myNodes.push(tempNodes[lmN]);
					})						

					// console.log(myNodes);
					$('#procedure_view').empty();
					sankeyVis = new Sankey({
						ID: "#procedure_view",
						width: $("#procedure_view").width(),
						height: $("#procedure_view").height(),
						// width: width,
						// height: height,
						margin: {top: 10, right: 10, bottom: 10, left: 10},
						data: {"nodes": myNodes, "links": edges},
						colorScale : sankColor,
						clickCallBack: nodeClickCallBack
					})					

					if(showLabelBool == true){
						d3.selectAll('.node text').style('opacity', 1);
					}
					else{
						d3.selectAll('.node text').style('opacity', 0);
					}

					spinner.stop();


	            },
	            error: function(){
	            	console.log("There was problem with getting the data");
	            }	
			});

		}

		function splitNode2(){
			var idList = $('input:checkbox:checked.list_checkbox').map(function () {
			  return parseInt(this.value);
			}).get();

			console.log(currentClickNode);

			spinner.spin(target);
			$.ajax({
	            type:'GET',
	            contentType: 'application/json',
	            dataType: 'json',
	            url: '/splitNode',
	            data: {"idList" :  idList, "lmID" : currentClickNode["nodeSpecialID"]},
	            success: function(newData){

	            	var data = newData["graph"];
	            	var offSet = 0;
	            	nodes = data["nodes"];
	            	edges = data["edges"];
	            	var myNodes = [];

		        	var labelList = Object.keys(nodes);
		        	labelList.forEach(function(lab){
		        		var tempObj = nodes[lab];
		        		myNodes.push(tempObj);
		        	});

	            	edgeList = data["edgeList"];
	            	nodeList = data["nodeList"];
	            	connectionList = data["connInfo"];

	            	console.log(edges);

	            	console.log(edgeList);

	            	// console.log(edges);

					var remapResult = remapID(myNodes, edges, labelList);

					// console.log(remapResult);

					var newToolTipData = {"edgeList" : edgeList, "nodeList": nodeList, "connInfo" : connectionList}
					var histogramData = newData["histogramData"];
					sankeyVis.updateData({"nodes" : remapResult["nodes"], "links" : remapResult["links"], "toolTipData" : newToolTipData, "histogramData" : histogramData});
					if(showLabelBool == true){
						d3.selectAll('.node text').style('opacity', 1);
					}
					else{
						d3.selectAll('.node text').style('opacity', 0);
					}
					spinner.stop();


	            },
	            error: function(){
	            	console.log("There was problem with getting the data");
	            }	
			});			
		}

		//this function split the 
		// function splitNodeByParents(parentProcList, nodeLabel, nodeSpecialID){
		function splitNodeByParents(){
			var nodeLabel = currentClickNode["nodeLabel"];
			var nodeSpecialID = currentClickNode["nodeSpecialID"];
			var parentProcList = {};
			spinner.spin(target);
			$.ajax({
	            type:'GET',
	            contentType: 'application/json',
	            dataType: 'json',
	            url: '/splitNodeByParents',
	            data: {"parentProcList" :  parentProcList, "nodeLabel" : nodeLabel, "nodeSpecialID" : nodeSpecialID},
	            success: function(newData){

	            	var data = newData["graph"];
	            	var offSet = 0;
	            	nodes = data["nodes"];
	            	edges = data["edges"];
	            	var myNodes = [];

		        	var labelList = Object.keys(nodes);
		        	labelList.forEach(function(lab){
		        		var tempObj = nodes[lab];
		        		myNodes.push(tempObj);
		        	});	            	

	            	edgeList = data["edgeList"];
	            	nodeList = data["nodeList"];


					var remapResult = remapID(myNodes, edges, labelList);
					var newToolTipData = {"edgeList" : edgeList, "nodeList": nodeList}
					var histogramData = newData["histogramData"];
					sankeyVis.updateData({"nodes" : remapResult["nodes"], "links" : remapResult["links"], "toolTipData" : newToolTipData, "histogramData" : histogramData});
					if(showLabelBool == true){
						d3.selectAll('.node text').style('opacity', 1);
					}
					else{
						d3.selectAll('.node text').style('opacity', 0);
					}

					spinner.stop();


	            },
	            error: function(){
	            	console.log("There was problem with getting the data");
	            }	
			});				
		}
		//this function split the entry points of the parent nodes
		function splitParentNode(node){
			var currentNodeSankeyID = node.myID;
			var parentsSpecialID = [];


			//get parent special id based on the edges
			edges.forEach(function(edge){
				//this edge's target is me
				//that mean the source is my parent
				if(edge["targetID"] == currentNodeSankeyID){
					var parentSpcID = edge["sourceSpcID"];
					if(parentsSpecialID.indexOf(parentSpcID) == -1){
						parentsSpecialID.push(parentSpcID);
					}
				}
			});

			//loop through the parent spc id
			//for each, get the function id
			parentsSpecialID.forEach(function(parentSpecID){

			})

			$.ajax({
	            type:'GET',
	            contentType: 'application/json',
	            dataType: 'json',
	            url: '/getLists',
	            data: {"specialIDs" : parentsSpecialID},
	            success: function(newData){

	            	console.log("done with getting lists of functions for parents");
	            	console.log(newData);
	            },
	            error: function(){
	            	console.log("There was problem with getting the data");
	            }	
			});					

			//sort them by inclusive time
			//lable each function clearly with time and lm
			//let the user select which function to split
			//this is to keep consistent with the other split method

		}

		function getEntryPoints(specID){

		}

		function brushCallBack(processIDList){

			$.ajax({
	            type:'GET',
	            contentType: 'application/json',
	            dataType: 'json',
	            url: '/calcEdgeValues',
	            data: {"processIDList" : processIDList},
	            success: function(edgeSets){

	            	// edges = edgeSets["brush"];
		        	var myNodes = [];

		        	var labelList = Object.keys(nodes);
		        	labelList.forEach(function(lab){
		        		var tempObj = nodes[lab];
		        		myNodes.push(tempObj);
		        	})

	
		        	// console.log(edgeSets["brush"]);

		        	var remapedEdgesBrushed = reMapEdges(edgeSets["brush"]);
		        	var remapedEdgesNonBrushed = reMapEdges(edgeSets["nonBrush"]);

		        	// console.log(remapedEdgesBrushed);

					sankeyVis.changeProcessSelect({"brush": edgeSets["brush"], "nonBrush" : edgeSets["nonBrush"]});	
					sankeyVis.changeProcessSelect({"brush": remapedEdgesBrushed, "nonBrush" : remapedEdgesNonBrushed});		

					if(showLabelBool == true){
						d3.selectAll('.node text').style('opacity', 1);
					}
					else{
						d3.selectAll('.node text').style('opacity', 0);
					}
	            },
	            error: function(){
	            	console.log("There was problem with getting the metric data");
	            }	
			});					

		}

		function remapID(newNodes, newEdges, newNodeListLabel){
			//first find the difference between the old nodes and the new nodes
			//basically, nodes that are in the old list but not in the new list
			var oldNodeListLabel = Object.keys(specialIDToSankIDMap);
			var removeNodesLabel = [];
			oldNodeListLabel.forEach(function(oNodeLab){
				if(newNodeListLabel.indexOf(oNodeLab) == -1){
					//so we remove the node with this label
					removeNodesLabel.push(oNodeLab);
				}
			});

			//now mapping the newNodeID to the old one
			//reused the remove ones or create new one as needed
			var newSpecialIDToSankIDMap = {};
			var tempMaxID = 0;

			newNodes.forEach(function(nNode){
				var curretnNodeLabel = nNode["specialID"];
				if(specialIDToSankIDMap[curretnNodeLabel] != null){
					// if(curretnNodeLabel == "LM8_0"){
					// 	nNode["specialID"] = "LM8_10";
					// 	nNode["name"] = "LEOS";
					// }

					nNode["sankeyID"] = specialIDToSankIDMap[curretnNodeLabel];
				}
				else{
					//this is a new label

					//first check if we can reuse an old one
					if(removeNodesLabel.length > 0){
						var reuseLabel = removeNodesLabel[0];
						nNode["sankeyID"] = specialIDToSankIDMap[reuseLabel];
						removeNodesLabel.shift();
					}
					else{
						//don't have anymore to resuse
						currentMaxID += 1;
						nNode["sankeyID"] = currentMaxID;
					}
				}

				newSpecialIDToSankIDMap[curretnNodeLabel] = nNode["sankeyID"];
			})

			newEdges.forEach(function(nEdge){
				console.log(nEdge);
				nEdge["source"] = newSpecialIDToSankIDMap[ nEdge["sourceLabel"] ];
				nEdge["sourceID"] = newSpecialIDToSankIDMap[ nEdge["sourceLabel"] ];
				nEdge["target"] = newSpecialIDToSankIDMap[ nEdge["targetLabel"] ];
				nEdge["targetID"] = newSpecialIDToSankIDMap[ nEdge["targetLabel"] ];
			})

			newNodes.sort(function(a,b){
				return a['sankeyID'] - b["sankeyID"];
			})
			newEdges.sort(function(a,b){
				return a["sourceID"] - b["targetID"];
			})

			specialIDToSankIDMap = newSpecialIDToSankIDMap;

			// console.log(specialIDToSankIDMap, newSpecialIDToSankIDMap, newEdges, newNodes);

			return {"nodes" : newNodes, "links" : newEdges};
			// sankeyVis.updateData({"nodes" : newNodes, "links" : newEdges});

		}

		function reMapEdges(edges){
			edges.forEach(function(nEdge){
				nEdge["source"] = specialIDToSankIDMap[ nEdge["sourceLabel"] ];
				nEdge["sourceID"] = specialIDToSankIDMap[ nEdge["sourceLabel"] ];
				nEdge["target"] = specialIDToSankIDMap[ nEdge["targetLabel"] ];
				nEdge["targetID"] = specialIDToSankIDMap[ nEdge["targetLabel"] ];
			})

			edges.sort(function(a,b){
				return a["sourceID"] - b["targetID"];
			})	

			return edges;		
		}

		function colorDropDownChange(){

			var colorOption = parseInt(Number($("#colorDropDown").val()));
			console.log(colorOption);
			colorScaleLegend(colorOption);

			if(sankeyVis){
				var runTimes = sankeyVis.changeNodeColor(colorOption);

				if(colorOption == 1 || colorOption == 2){

					var slowTimeTxt = (runTimes[0] * 0.000001).toFixed(3) + "s";
					var fastTimeTxt = (runTimes[1] * 0.000001).toFixed(3) + "s";
					$("#slowAttr").text(slowTimeTxt);
					$("#fastAttr").text(fastTimeTxt);
				}
				else if(colorOption == 3){
					$("#slowAttr").text(0);
					$("#fastAttr").text(1);
				}
			}

		}

		function colorScaleLegend(colorOption){
			var w = 200, h = 70;
			var colorScaleHeight = 30
			var nodeRunTimeColorScale;
			var spanColor;
			var innerHTMLText = [];
			if(colorOption != 4){
				nodeRunTimeColorScale = 'OrRd';
				spanColor = chroma.scale(nodeRunTimeColorScale).padding([0.2, 0]).domain([0,99]);
				innerHTMLText = ["low", "high"];

			}
			else{
				nodeRunTimeColorScale = 'RdYlBu';
				spanColor = chroma.scale(nodeRunTimeColorScale).domain([0,99]);
				innerHTMLText = ["-1", "1"];
			}

			// console.log(spanColor(1));

			var timeScaleDiv = document.getElementById('metricColorScale');
			$("#metricColorScale").width(200);
			$("#metricColorScale").height(h);
			$("#metricColorScale").empty();
			if(colorOption > 0){
				for(var i = 0 ; i < 100; i++){
					// nodeRunData.push(i);
					var newSpan = document.createElement('span');
					newSpan.style.backgroundColor = spanColor(i);
					newSpan.style.display = 'inline-block';
					newSpan.style.height = colorScaleHeight + 'px';
					newSpan.style.width = '1%';
					timeScaleDiv.appendChild(newSpan);
				}

				var fastSpan = document.createElement('span');
				// fastSpan.setAttribute("id", "fastSpan");
				fastSpan.style.position = "relative";
				fastSpan.style.left = "0";
				fastSpan.style.fontSize = "15px";
				fastSpan.style.fontFamily = "sans-serif";
				fastSpan.style.top = "5px";
				fastSpan.innerHTML = innerHTMLText[0];
				fastSpan.setAttribute("id", "slowAttr");
				timeScaleDiv.appendChild(fastSpan);

				var slowSpan = document.createElement('span');
				slowSpan.style.position = "absolute";
				// slowSpan.style.left = "140";
				slowSpan.style.left = "190";
				slowSpan.style.fontSize = "15px";
				slowSpan.style.fontFamily = "sans-serif";
				// slowSpan.style.top = $("#metricColorScale").position().top + colorScaleHeight + 5;// + 5;
				slowSpan.style.top = $("#slowAttr").position().top;
				slowSpan.innerHTML = innerHTMLText[1];
				slowSpan.setAttribute("id", "fastAttr");

				console.log($("#metricColorScale").position().top, colorScaleHeight, $("#slowAttr").position().top);


				timeScaleDiv.appendChild(slowSpan);	
			}
		
		}

		function showDatasetInfo(){
			console.log("the nav bar was click");
			var datasetName = dataSetInfo["dataName"] || "Unknown";
			var numbOfNodes = dataSetInfo["numbNodes"] || "Unknown";
			var string = "";
			string += "Name: " + datasetName + " \n";
			string += "Number of Processes: " + numbOfNodes + " \n";
			string += "Path: " + dataSetInfo["path"] + " \n";
			string += "Experiment: " + dataSetInfo["experiment"];

			alert(string);
		}

		// $('#showLabelBox').attr('checked',false);
		$("#showLabelBox").on("change",function(){
			console.log("checkbox");
		})

		$(document).ready(function () {
			$("#showLabelBox").on("change",function(){
				var checkBoxStatus = $("#showLabelBox").is(':checked');

				showLabelBool = checkBoxStatus;
				if(showLabelBool == true){
					d3.selectAll('.node text').style('opacity', 1);
				}
				else{
					d3.selectAll('.node text').style('opacity', 0);
				}				
			})

			$("#setRangeBtr").on('click', function(){
				console.log('button is click');
				var minVal;
				var maxVal;

				if( isNaN( parseInt($('#maxVal').val()) ) ){
					maxVal = null
				}
				else{
					maxVal = parseInt($('#maxVal').val());
				}
				if( isNaN( parseInt($('#minVal').val()) ) ){
					minVal = null
				}
				else{
					minVal = parseInt($('#minVal').val());
				}

				if(minVal != null && maxVal != null && ( minVal < 1 || minVal > maxVal )){
					alert("Please make sure that minimun value is >= 1 and min val <= max value")
				}

				var colorOption = parseInt(Number($("#colorDropDown").val()));
				
				if(colorOption == 1 || colorOption == 2 && sankeyVis){
					sankeyVis.setGlobalRange(colorOption, minVal, maxVal);
				}

				if(colorOption == 1 || colorOption == 2){

					if( !isNaN( parseInt($('#minVal').val()) ) ){
						var slowTimeTxt = (minVal).toFixed(3) + "s";
						$("#slowAttr").text(slowTimeTxt);
					}
					
					if( !isNaN( parseInt($('#maxVal').val()) ) ){
						var fastTimeTxt = (maxVal).toFixed(3) + "s";	
						$("#fastAttr").text(fastTimeTxt);
					}

				}
				else if(colorOption == 3){
					$("#slowAttr").text(0);
					$("#fastAttr").text(1);
				}
				else{
					$("#slowAttr").text("N/A");
					$("#fastAttr").text("N/A");
				}

			})
		});










