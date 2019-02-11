function drawIcicleHierarchy(view, hierarchy){
  // Breadcrumb dimensions: width, height, spacing, width of tip/tail.
  var b = {
    w: 75, h: 30, s: 3, t: 10
  };
  
  let path = hierarchy[3]
  let val = hierarchy[1]

  let path_hierarchy_format = []
  for(let i in path){
    if(path.hasOwnProperty(i)){
      path_hierarchy_format[i] = []
      path_hierarchy_format[i].push(path[i])
      path_hierarchy_format[i].push(val[i])
    }
  }
  let json = buildHierarchy(path_hierarchy_format);
  createVisualization(view, json);
}

function buildHierarchy(csv) {  
  var root = {"name": "root", "children": []};
  for (var i = 0; i < csv.length; i++) {
    var sequence = csv[i][0];
    var size = csv[i][1];
    var parts = sequence;
    var currentNode = root;
    for (var j = 0; j < parts.length; j++) {
      var children = currentNode["children"];
      var nodeName = parts[j];
      var childNode;
      if (j + 1 < parts.length) {
        // Not yet at the end of the sequence; move down the tree.
        var foundChild = false;
        for (var k = 0; k < children.length; k++) {
          if (children[k]["name"] == nodeName) {
            childNode = children[k];
            foundChild = true;
            break;
          }
        }
        // If we don't already have a child node for this branch, create it.
        if (!foundChild) {
          childNode = {"name": nodeName, "children": []};
          children.push(childNode);
        }
        currentNode = childNode;
      } else {
        // Reached the end of the sequence; create a leaf node.
        childNode = {"name": nodeName, "weight": size, "children": []};
        children.push(childNode);
      }
    }
  }
  return root;
};



function createVisualization(view, json) {
  // Mapping of step names to colors.
  var colors = {}
  // Total size of all segments; we set this later, after loading the data.
  var totalSize = 0; 

  var width = $('#component_graph_view').width()
  var height = $('#component_graph_view').height()
  
  var vis = d3.select("#component_graph_view").append("svg:svg")
      .attr("width", width)
      .attr("height", height)
      .append("svg:g")
      .attr("id", "container");

  var partition = d3.layout.partition()
      .size([width, height])
      .value(function(d) { return d.weight; });

  
  // Basic setup of page elements.
  initializeBreadcrumbTrail();
//  drawLegend();
  d3.select("#togglelegend").on("click", toggleLegend);

  // Bounding rect underneath the chart, to make it easier to detect
  // when the mouse leaves the parent g.
  vis.append("svg:rect")
      .attr("width", width)
      .attr("height", height)
      .style("opacity", 0);

  // For efficiency, filter nodes to keep only those large enough to see.
  var nodes = partition.nodes(json)
      .filter(function(d) {
      return (d.dx > 0.5);
      });

  var node = vis.data([json]).selectAll(".node")
      .data(nodes)
      .enter().append("rect")
      .attr("class", "node")
      .attr("x", function(d) { return d.x; })
      .attr("y", function(d) { return d.y; })
      .attr("width", function(d) { return d.dx; })
      .attr("height", function(d) { return d.dy; })
      .attr("display", function(d) { return d.depth ? null : "none"; })
      .style("fill", function(d) { return view.color.getColor(d); })
      .style("opacity", 1)
      .on("mouseover", mouseover);

  // Add the mouseleave handler to the bounding rect.
  d3.select("#container").on("mouseleave", mouseleave);

  // Get total size of the tree = value of root node from partition.
  totalSize = node.node().__data__.value;
 };

// Fade all but the current sequence, and show it in the breadcrumb trail.
function mouseover(d) {

  var percentage = (100 * d.value / totalSize).toPrecision(3);
  var percentageString = percentage + "%";
  if (percentage < 0.1) {
    percentageString = "< 0.1%";
  }

  var sequenceArray = getAncestors(d);
  updateBreadcrumbs(sequenceArray, percentageString);

  // Fade all the segments.
  d3.selectAll(".node")
      .style("opacity", 0.3);

  // Then highlight only those that are an ancestor of the current segment.
  vis.selectAll(".node")
      .filter(function(node) {
                return (sequenceArray.indexOf(node) >= 0);
              })
      .style("opacity", 1);
}

// Restore everything to full opacity when moving off the visualization.
function mouseleave(d) {

  // Hide the breadcrumb trail
  d3.select("#trail")
      .style("visibility", "hidden");

  // Deactivate all segments during transition.
  d3.selectAll(".node").on("mouseover", null);

  // Transition each segment to full opacity and then reactivate it.
  d3.selectAll(".node")
      .transition()
      .duration(1000)
      .style("opacity", 1)
      .each("end", function() {
              d3.select(this).on("mouseover", mouseover);
            });
}

// Given a node in a partition layout, return an array of all of its ancestor
// nodes, highest first, but excluding the root.
function getAncestors(node) {
  var path = [];
  var current = node;
  while (current.parent) {
    path.unshift(current);
    current = current.parent;
  }
  return path;
}

function initializeBreadcrumbTrail() {
  // Add the svg area.
    var width = $('#component_graph_view').width()
  var trail = d3.select("#sequence").append("svg:svg")
      .attr("width", width)
      .attr("height", 50)
      .attr("id", "trail");
  // Add the label at the end, for the percentage.
  trail.append("svg:text")
    .attr("id", "endlabel")
    .style("fill", "#000");
}

// Generate a string that describes the points of a breadcrumb polygon.
function breadcrumbPoints(d, i) {
  var points = [];
  points.push("0,0");
  points.push(b.w + ",0");
  points.push(b.w + b.t + "," + (b.h / 2));
  points.push(b.w + "," + b.h);
  points.push("0," + b.h);
  if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
    points.push(b.t + "," + (b.h / 2));
  }
  return points.join(" ");
}

// Update the breadcrumb trail to show the current sequence and percentage.
function updateBreadcrumbs(nodeArray, percentageString) {

  // Data join; key function combines name and depth (= position in sequence).
  var g = d3.select("#trail")
      .selectAll("g")
      .data(nodeArray, function(d) { return d.name + d.depth; });

  // Add breadcrumb and label for entering nodes.
  var entering = g.enter().append("svg:g");

  entering.append("svg:polygon")
      .attr("points", breadcrumbPoints)
      .style("fill", function(d) { return "#f1f1f1" });

  entering.append("svg:text")
      .attr("x", (b.w + b.t) / 2)
      .attr("y", b.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(function(d) { return d.name; });

  // Set position for entering and updating nodes.
  g.attr("transform", function(d, i) {
    return "translate(" + i * (b.w + b.s) + ", 0)";
  });

  // Remove exiting nodes.
  g.exit().remove();

  // Now move and update the percentage at the end.
  d3.select("#trail").select("#endlabel")
      .attr("x", (nodeArray.length + 0.5) * (b.w + b.s))
      .attr("y", b.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(percentageString);

  // Make the breadcrumb trail visible, if it's hidden.
  d3.select("#trail")
      .style("visibility", "");

}

function drawLegend() {

  // Dimensions of legend item: width, height, spacing, radius of rounded rect.
  var li = {
    w: 75, h: 30, s: 3, r: 3
  };
  var width = $('#component_graph_view').width()
  var legend = d3.select("#legend").append("svg:svg")
      .attr("width", li.w)
      .attr("height", d3.keys(colors).length * (li.h + li.s));

  var g = legend.selectAll("g")
      .data(d3.entries(colors))
      .enter().append("svg:g")
      .attr("transform", function(d, i) {
              return "translate(0," + i * (li.h + li.s) + ")";
           });

  g.append("svg:rect")
      .attr("rx", li.r)
      .attr("ry", li.r)
      .attr("width", li.w)
      .attr("height", li.h)
      .style("fill", function(d) { return d.value; });

  g.append("svg:text")
      .attr("x", li.w / 2)
      .attr("y", li.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(function(d) { return d.key; });
}

function toggleLegend() {
  var legend = d3.select("#legend");
  if (legend.style("visibility") == "hidden") {
    legend.style("visibility", "");
  } else {
    legend.style("visibility", "hidden");
  }
}

function a(){
  let nodeOffset = 3
  let parentNodeName = "n" + d.n_index

  function avg(arr){
    let ret = {}
    let sum_exc = 0
    let sum_inc = 0
    for(let i = 0; i < arr.length; i++){
      sum_exc += arr[i]['exc']
      sum_inc += arr[i]['inc']
    }
    return {
      'weight': sum_inc/arr.length,
    }
  }

  let tot_avg = 0;
  for(let i = 0; i < nodes.length; i++){
    tot_avg += avg(nodes[i])['weight']
  }
  
  let parentColor = new Color(view)
	parentColor.setColorScale(0, d.weight, 0, 0)

  let floating_height = 0;
  nodes.sort(function(a, b){
    return avg(b)['weight'] - avg(a)['weight']
  })


  for(let i = 0; i < nodes.length; i++){
    let w = avg(nodes[i])
    let h = 0;
    if(d.height != undefined){
      h = (d.height*w['weight'])/tot_avg
    } else{
      h = (node_heights[nodes[i][0].n_index]*w['weight'])/tot_avg
    }
    
    let node = view.nodes.select('#'+ parentNodeName)
        .data(nodes[i]) .append('g');

    let rect = node.append('rect')
	      .attr("height", function (d) {
	        return h;
	      })
	      .attr("width", view.nodeWidth/2)
        .attr("opacity", 1)
        .attr("x", function(d){
          return view.nodeWidth + (level - 1)*(view.nodeWidth/2);
        })
        .attr("id", function(d){
          return "n" + d.n_index;
        })
        .attr("y", function(d){
          return floating_height;
        })
	      .style("fill", function (d) {
          return view.color.getColor(d);
	      })
	      .style("fill-opacity", function(d){
	        if(d.name == "intermediate" || d.name[d.name.length - 1] == '_'){
            if(d.name[0] == "intermediate"){
		          return 0;
	          }
	          else{
		          return 1;
	          }
	        }
	      })
	      .style("shape-rendering", "crispEdges")
	      .style("stroke", function (d) {
          if(d.name != "intermediate"){
		        return d3.rgb(view.color.getColor(w)).darker(2);
	        }
	        else{
		        return '#e1e1e1';
	        }
	      })
	      .style("stroke-width", function(d){
	        if(d.name[0] == "intermediate" || d.name[0][d.name[0].length - 1] == '_'){
            if(d.name[0] == "intermediate"){
		          return 0;
	          }
	          else{
		          return 1;
	          }
	        }
	      })
        .on('dblclick', function(d){
          let level = 1;
          current_level[d.mod_index] += 1;
          getNextLevelNodes(d, level).then( (data) => {
            let arr_data = Object.values(data)
            getFunctionLists(d)
            drawLevelNodes(graph, view, d, arr_data, current_level[d.mod_index])                
          });                
        })
    floating_height += h;

    let textTruncForNode = 4; let text = node.append("text")
        .attr('dy', '0.35em') .attr("transform", "rotate(90)")
        .attr('x', function(d){ return 5 + view.nodeWidth +
                                (level-1)*(view.nodeWidth/2);
	                            })
	      .attr('y', "-10")
	      .style('opacity', 1)
	      .text(function (d) {
	        if(d.name != "intermediate" && d.name[d.name.length - 1] != '_'){
	    	    if(d.height < view.minHeightForText ) {
	    	      return "";
	    	    }
	    	    else {
	    	      var textSize = calcTextSize(d.name)["width"];
	    	      if(textSize < d.height){
	    		      return d.name;
	    	      }
	    	      else{
	    		      return d.name.trunc(textTruncForNode);
	    	      }
	    	    }
	        }
	        else{
	    	    return "";
	        }
	      })
	      .on("mouseover", function(d){
	        if(d.name[0] != "intermediate"){
	    	    view.toolTipList.attr('width', "400px")
		          .attr('height', "150px")	    	
            //		var res = getFunctionListOfNode(d);
            //		toolTipTexts(d,res, rootRunTime1);
		        d3.select(this.parentNode).select('rect').style("stroke-width", "2");
	        }
	      })
	      .on("mouseout", function(d){
	        view.toolTipList.attr('width', '0px')
		        .attr('height', '0px')
	        if(d.name[0] != "intermediate"){
		        d3.select(this.parentNode).select('rect').style("stroke-width", "1");
		        //                unFade();
	        }
	        view.toolTip.style('opacity', 1)
		        .style('left', function(){
		          return 0;
		        })
		        .style('top', function(){
		          return 0;
		        })
	        view.toolTipText.html("");		    
	        view.toolTipG.selectAll('*').remove();		    		
	      })
  }
}


    

function drawLegend() {

    // Dimensions of legend item: width, height, spacing, radius of rounded rect.
    var li = {
        w: 75, h: 30, s: 3, r: 3
    };

    var legend = d3.select("#legend").append("svg:svg")
        .attr("width", li.w)
        .attr("height", d3.keys(colors).length * (li.h + li.s));

    var g = legend.selectAll("g")
        .data(d3.entries(colors))
        .enter().append("svg:g")
        .attr("transform", function(d, i) {
            return "translate(0," + i * (li.h + li.s) + ")";
        });

    g.append("svg:rect")
        .attr("rx", li.r)
        .attr("ry", li.r)
        .attr("width", li.w)
        .attr("height", li.h)
        .style("fill", function(d) { return d.value; });

    g.append("svg:text")
        .attr("x", li.w / 2)
        .attr("y", li.h / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text(function(d) { return d.key; });
}

function toggleLegend() {
    var legend = d3.select("#legend");
    if (legend.style("visibility") == "hidden") {
        legend.style("visibility", "");
    } else {
        legend.style("visibility", "hidden");
    }
}


export {
    drawIcicleHierarchy
}
