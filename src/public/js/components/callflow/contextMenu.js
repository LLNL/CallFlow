export default function contextMenu(openCallback) {
    let menu = [
        {
	        title: 'Automatic sort',
	        action: function(elm, d, i) {
	            spinner = new Spinner(opts).spin(View.parentOfView);
	            var request = {
		            "boxes": State.box,
		            "boxID": d.id,
		            'automaticSortValue': State.automaticSortValue
	            };
	            socket.emit("getClickStateFromBox", request);
	            socket.on('clickStateFromBox', function(data){
		            State = JSON.parse(data);
		            nodeSize = assignNodeSize(statistics.Attribute, statistics.sequenceCount[attribute]);
		            boxOffsets = findBoxOffsets();
		            [nodes, edges] = preprocess(State.box, null);
		            render(nodes, edges);
	            });
	        }
        },
        {
	        title: 'Forward re-arrangement',
	        action : function(elm, d, i){
	            let box = d.id;
	            order = 1;
	            iciSankClearNodes(box);
	            iciSankDrawNodes(box, preprocess.nodeMap[box], order);
	        }
        },
        {
	        title: 'Reverse re-arrangement',
	        action: function(elm, d, i){
	            let box = d.id;
	            iciSankClearNodes(box);
                iciSank_clearEdgesBox();
	            order = -1;
	            iciSank_drawEdgesBox(preprocess.reverseEdges);
	            iciSankDrawNodes(box, preprocess.reverseNodeMap[box], order);
	        }
        },
        {
	        title: 'Pivotal alignment',
	        action: function(elm, d, i){
                Api.pivotQuery(App.pivot)
                    .then(function(){
                        reload_click()
                    })
            }
        },
        {
	        title: 'Horizontal Reduction',
	        action: function(elm, d, i) {
	            
	        }
        },
        {
	        title: 'clear shiftArray',
	        action: function(elm, d ,i){
	            shiftButtonArray = [];
	        }
        },
        {
	        title: 'Hide edge Boxes',
	        action: function(elm, d, i){
	            iciSank_clearEdgesBox();
	        }
        },
        {
	        title: 'Hide edges',
	        action: function(elm, d, i){
	            iciSank_clearEdges();
	        }
        },
        {
	        title: 'Hide column indicator',
	        action: function(elm, d, i){
	            iciSank_clearColumnIndicator();
	        }
        },
        {
	        title: 'Show sub-patterns',
	        action: function(elm, d, i){
	            handleMouseOverHighlightEvents(d.id);
	        }
        },
        {
	        title: 'Mask',
	        action: function(elm, d, i){
	            let box = d.id;
	            var maskColors = {}; 
	            d3.selectAll('.node')
		            .transition()
		            .duration(200)
		            .style('stroke', function(d){
		                return '#000';
		            })
		            .style('fill', function(d){
		                if(colorPallete[d.event] == undefined && maskColors[d.event] == undefined && d.box == box){
			                maskColors[d.event] = chroma.random();
			                return maskColors[d.event];
		                }
		                else if(colorPallete[d.event] == undefined && maskColors[d.event] != undefined && d.box == box){
			                return maskColors[d.event];
		                }
		                else if(d.box != box){
			                if(colorPallete[d.event] == undefined){
			                    return greyColor;
			                }
			                return colorPallete[d.event];
		                }
		                else {
			                return greyColor;
		                }
		            })
	        }
        },
        {
	        title: 'Time Interval',
	        action: function(elm, d, i){
	            let box = d.id;
	            d3.selectAll('.node')
		            .transition()
		            .duration(200)
		            .style('stroke', 'black')
		            .style('stroke-width', function(d){
                        //		    console.log(box, d.box, d.timeInterval, maxTimeInterval[d.box]);
		                if(d.box == box){
			                if(d.timeInterval/maxTimeInterval[d.box] > 0.1){
			                    return 1;
			                }
			                else{
			                    return 0.5 + (d.timeInterval)/maxTimeInterval[box];
			                }
		                }
		                else{
			                return 0.1;
		                }
		            })
		            .style('opacity', function(d){
		                if(d.box == box){
			                if(d.timeInterval/maxTimeInterval[d.box] > 0.1){
			                    return 1;
			                }
			                else{
			                    return 0.5 + (d.timeInterval)/maxTimeInterval[box];
			                }
		                }
		            })
	        }
        }
    ];

    // create the div element that will hold the context menu
    d3.selectAll('.d3-context-menu').data([1])
	    .enter()    
	    .append('div')
	    .attr('class', 'd3-context-menu');

    // close menu
    d3.select('body').on('click.d3-context-menu', function() {
	    d3.select('.d3-context-menu').style('display', 'none');
    });

    // this gets executed when a contextmenu event occurs
    return function(data, index) {	
	    var elm = this;

        console.log($('.d3-context-menu'))
	    d3.selectAll('.d3-context-menu').html('');
	    var list = d3.selectAll('.d3-context-menu').append('ul');
	    list.selectAll('li').data(menu).enter()
	        .append('li')
	        .html(function(d) {
		        return d.title;
	        })
	        .on('click', function(d, i) {
		        d.action(elm, data, index);
		        d3.select('.d3-context-menu').style('display', 'none');
	        });

	    // the openCallback allows an action to fire before the menu is displayed
	    // an example usage would be closing a tooltip
        console.log(data)
	    if (openCallback) openCallback(data, index);

	    // display context menu
	    d3.select('.d3-context-menu')
	        .style('left', (d3.event.pageX - 2) + 'px')
	        .style('top', (d3.event.pageY - 2) + 'px')
	        .style('display', 'block');

	    d3.event.preventDefault();
    };
};
