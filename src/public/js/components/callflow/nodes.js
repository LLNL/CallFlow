import { getHistogramData, getFunctionLists, getHierarchy } from '../../routes';
import { drawIcicleHierarchy } from './hierarchy';

const node_heights = {};
const current_level = {};

function calcTextSize(text) {
    if (!d3) return;
    const container = d3.select('body').append('svg');
    container.append('text').attr({ x: -99999, y: -99999 }).text(text);
    const size = container.node().getBBox();
    container.remove();
    return { width: size.width, height: size.height };
}

function drawNodes(graph, view) {
    const node = view.nodes.selectAll('.node')
	    .data(graph.nodes)
	    .enter().append('g')
	    .attr('class', (d) => {
	      if (d.name == 'intermediate' || d.name[0][d.name[0].length - 1] == '_') {
		      return 'node intermediate';
	      }

		      return 'node';
	    })
	    .attr('opacity', 0)
        .attr('id', d => `n${  d.n_index}`)
	    .attr('transform', (d) => {
	      if (d.name != 'intermediate') {
		      return `translate(${  d.x  },${  d.y  })`;
	      }

		      return 'translate(0,0)';
	    });

    view.nodes.selectAll('.node')
	  .data(graph.nodes)
	  .transition()
	  .duration(view.transitionDuration)
	  .attr('opacity', 1)
	  .attr('transform', d => `translate(${  d.x  },${  d.y  })`);

    drawRectangle(node, graph, view);
    drawPath(node, graph, view);
    drawText(node, graph, view);
}

function clearNodes(view) {
    view.nodes.selectAll('.node').remove();
}

// add the rectangles for the nodes
function drawRectangle(node, graph, view) {
    const rect = node.append('rect')
	    .attr('height', (d) => {
            current_level[d.mod_index] = 0;
            node_heights[d.n_index] = d.height;
	      return d.height*1.5;
	    })
	    .attr('width', view.nodeWidth)
        .attr('opacity', 0)
	    .style('fill', d => view.color.getColor(d))
	    .style('fill-opacity', (d) => {
	      if (d.name == 'intermediate' || d.name[d.name.length - 1] == '_') {
                if (d.name[0] == 'intermediate') {
		        return 0;
	        }
		        return 1;
	      }
	    })
	    .style('shape-rendering', 'crispEdges')
	    .style('stroke', (d) => {
            if (d.name != 'intermediate') {
		return d3.rgb(view.color.getColor(d)).darker(2);
	      }
		      return '#e1e1e1';
	    })
	    .style('stroke-width', (d) => {
	      if (d.name[0] == 'intermediate' || d.name[0][d.name[0].length - 1] == '_') {
                if (d.name[0] == 'intermediate') {
		        return 0;
	        }
		        return 1;
	      }
	    })
	    .on('mouseover', function (d) {
	      if (d.name != 'intermediate') {
		      view.toolTipList.attr('width', '400px')
		        .attr('height', '150px');
                // var res = getFunctionListOfNode(graph, d);
                // toolTipTexts(d,res, rootRunTime1)
		      d3.select(this).style('stroke-width', '2');
		      // fadeUnConnected(d);
		      // svg.selectAll(".link").style('fill-opacity', 0.0)
		      // svg.selectAll('.node').style('opacity', '0.0')
	      }
	    })
	    .on('mouseout', function (d) {
	      view.toolTipList.attr('width', '0px')
		      .attr('height', '0px');
	      if (d.name[0] == 'intermediate' || d.name[0][d.name[0].length - 1] == '_') {
		      d3.select(this).style('stroke-width', '1');
		      //                unFade();
	      }
	      view.toolTip.style('opacity', 0)
		      .style('left', () => 0)
		      .style('top', () => 0);
	      view.toolTipText.html('');
	      view.toolTipG.selectAll('*').remove();
	    })
      .on('click', (d) => {
        view.selectedModule = d;
        getHierarchy(d).then((data) => {
          drawIcicleHierarchy(view, data);
          // getFunctionLists(view.selectedModule).then((data) => {

          // });
        });
      });
    // .on('contextmenu', function(d){
    //     return view.svgBase.contextMenu(d);
    // })

    // Transition
    view.nodes.selectAll('rect')
	  .data(graph.nodes)
	  .transition()
	  .duration(view.transitionDuration)
        .attr('opacity', 1)
	  .attr('height', d => d.height)
	  .style('fill', (d) => {
	    if (d.name == 'intermediate') {
		    return '#e1e1e1';
	    }

		    return d.color = view.color.getColor(d);
	  })
        .style('stroke', (d) => {
            if (d.name == 'intermediate') {
                return 0;
            }
            return 1;
        });
}

function drawPath(node, graph, view) {
    node.append('path')
	  .attr('d', (d) => {
	    if (d.name == 'intermediate') {
		    return `m${  0  } ${  0
		       }h ${  view.sankey.nodeWidth()
		       }v ${  (1) * 0
		       }h ${  (-1) * view.sankey.nodeWidth()}`;
	    }
	  })
	  .style('fill', (d) => {
	    if (d.name == 'intermediate') {
		    return 'grey';
	    }

		    return view.color.getColor(d);
	  })
	  .style('fill-opacity', (d) => {
	    if (d.name == 'intermediate') {
		    return 0.0;
	    }

		    return 0;
	  })
	  .style('stroke', (d) => {
	    if (d.name == 'intermediate') {
		    return 'grey';
	    }
	  })
	  .style('stroke-opacity', '0.0');

    view.nodes.selectAll('path')
	  .data(graph.nodes)
	  .transition()
	  .duration(view.transitionDuration)
	  .delay(view.transitionDuration / 3)
	  .style('fill-opacity', (d) => {
	    if (d.name[0] == 'intermediate') {
        return 0;
      }
	  });
}

function drawText(node, graph, view) {
    const textTruncForNode = 4;
    node.append('text')
	  .attr('dy', '0.35em')
	  .attr('transform', 'rotate(90)')
	  .attr('x', d =>
	    // return sankey.nodeWidth() + 5;
	     5,)
	  .attr('y', '-10')
	  .style('opacity', 1)
	  .text((d) => {
	    if(d.name != 'intermediate' && d.name[0][d.name[0].length - 1] != '_'){
	    	if(d.height < view.minHeightForText ) {
	    	  return '';
	    	}
	    	  var textSize = calcTextSize(d.name)['width'];
	    	  if(textSize < d.height){
	    		  return d.name[0];
	    	  }
	    	  else{
	    		  return d.name[0].trunc(textTruncForNode);
	    	  }
	    	
	    }
	    	return '';
	  })
	  .on('mouseover', function (d) {
	    if (d.name[0] != 'intermediate') {
	    	view.toolTipList.attr('width', '400px')
		      .attr('height', '150px');
		    d3.select(this.parentNode).select('rect').style('stroke-width', '2');
	    }
	  })
	  .on('mouseout', function (d) {
	    view.toolTipList.attr('width', '0px')
		    .attr('height', '0px');
	    if (d.name[0] != 'intermediate') {
		    d3.select(this.parentNode).select('rect').style('stroke-width', '1');
		    //                unFade();
	    }
	    view.toolTip.style('opacity', 1)
		    .style('left', () => 0)
		    .style('top', () => 0);
	    view.toolTipText.html('');
	    view.toolTipG.selectAll('*').remove();
	  });


    // Transition
    view.nodes.selectAll('text')
	  .data(graph.nodes)
	  .transition()
	  .duration(view.transitionDuration)
        .style('opacity', 1)
        .style('fill', d => view.color.setContrast(view.color.getColor(d)))
	  .text((d) => {
      let name_splits = d.name[0].split('/').reverse()
      if(name_splits.length == 1){
        d.name = d.name[0]
      }
      else{
        d.name = name_splits[0]
      }

      if(d.name != 'i' &&  d.name[d.name.length - 1] != '_'){
	    	if(d.height < view.minHeightForText ){
	    	  return '';
	    	}
	    	var textSize = calcTextSize(d.name)['width'];	    	        
	    	if(textSize < d.height){
	    		return d.name;
	    	}
	    	return d.name.trunc(textTruncForNode);
	    }
	    else{
	    	return '';
	    }
	  });
}


function toolTipTexts(node, data, runTimeR) {
    const fromProcToProc = data.fromProcToProc;
    const numberOfConn = Math.min(fromProcToProc.length, 10);
    const svgScale = d3.scale.linear().domain([2, 11]).range([50, 150]);
    toolTipList.attr('height', `${svgScale(numberOfConn)}px`);
    const mousePos = d3.mouse(d3.select(containerID).node());
    toolTip.style('opacity', 1)
        .style('left', () => {
            if (mousePos[0] + 10 + 500 > width) {
                return `${mousePos[0] - 500  }px`;
            } else if (mousePos[0] < 100) {
                return `${mousePos[0]   }px`;
            }

            return `${mousePos[0]  - 200  }px`;
        })
        .style('top', () => `${mousePos[1] + 50  }px`);
    toolTipText.html(`Name: ${node.name
    }<br> Inclusive Time: ${ (node.inclusive * 0.000001).toFixed(3) }s - ${(node.inclusive / runTimeR * 100).toFixed(3)}%` +
                   `<br> Exclusive Time: ${(node.exclusive * 0.000001).toFixed(3)}s - ${ (node.exclusive / runTimeR * 100).toFixed(3)}%`);


    const textLength = 100;
    const rectWidth = '5px';
    toolTipG.selectAll('*').remove();
    for (let tIndex = 0; tIndex < numberOfConn; tIndex++) {
        const yOffset = tIndex * 10;
        toolTipG.append('rect')
            .attr('width', rectWidth)
            .attr('height', '5px')
            .attr('y', `${yOffset}px`)
            .style('fill', color(fromProcToProc[tIndex].fromLM));
        const fpName = fromProcToProc[tIndex].fromProc;
        toolTipG.append('text')
            .attr('x', '10')
            .attr('y', `${yOffset + 5}px`)
            .text(fpName.trunc(20));
        toolTipG.append('text')
            .attr('x', '150')
            .attr('y', `${yOffset + 5}px`)
            .text('->');
        toolTipG.append('rect')
            .attr('width', rectWidth)
            .attr('height', '5px')
            .attr('x', '170px')
            .attr('y', `${yOffset}px`)
            .style('fill', color(fromProcToProc[tIndex].toLM));
        toolTipG.append('text')
            .attr('x', '180px')
            .attr('y', `${yOffset + 5}px`)
            .text(fromProcToProc[tIndex].toProc.trunc(20));
        // var timeInfo = fromProcToProc[0]["value"] + " (" + (fromProcToProc[0]["value"] / 36644360084 * 100 ) + "%)"
        const timeInfo = `${(fromProcToProc[tIndex].value / rootRunTime * 100).toFixed(3)}%`;
        toolTipG.append('text')
            .attr('x', '320')
            .attr('y', `${yOffset + 5}px`)
            .text(timeInfo);
    }
}

export {
    drawNodes,
    clearNodes,
};
