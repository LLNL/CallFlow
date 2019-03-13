/* eslint-disable no-undef */
export default function contextMenu(openCallback) {
    const menu = [
        {
	        title: 'Show names',
	        action(elm, d, i) {
            },
        },
        {
	        title: 'Forward re-arrangement',
	        action(elm, d, i) {
	        },
        },
        {
	        title: 'Reverse re-arrangement',
	        action(elm, d, i) {
	        },
        },
        {
	        title: 'Pivotal alignment',
	        action(elm, d, i) {
            },
        },
        {
	        title: 'Horizontal Reduction',
	        action(elm, d, i) {

	        },
        },
        {
	        title: 'clear shiftArray',
	        action(elm, d, i) {
	            shiftButtonArray = [];
	        },
        },
        {
	        title: 'Hide edge Boxes',
	        action(elm, d, i) {
	            iciSank_clearEdgesBox();
	        },
        },
        {
	        title: 'Hide edges',
	        action(elm, d, i) {
	            iciSank_clearEdges();
	        },
        },
        {
	        title: 'Hide column indicator',
	        action(elm, d, i) {
	            iciSank_clearColumnIndicator();
	        },
        },
        {
	        title: 'Show sub-patterns',
	        action(elm, d, i) {
	            handleMouseOverHighlightEvents(d.id);
	        },
        },
        {
	        title: 'Mask',
	        action(elm, d, i) {
	            const box = d.id;
	            const maskColors = {};
	            d3.selectAll('.node')
		            .transition()
		            .duration(200)
		            .style('stroke', d => '#000')
		            .style('fill', (d) => {
		                if (colorPallete[d.event] == undefined && maskColors[d.event] == undefined && d.box == box) {
			                maskColors[d.event] = chroma.random();
			                return maskColors[d.event];
		                } else if (colorPallete[d.event] == undefined && maskColors[d.event] != undefined && d.box == box) {
			                return maskColors[d.event];
		                } else if (d.box != box) {
			                if (colorPallete[d.event] == undefined) {
			                    return greyColor;
			                }
			                return colorPallete[d.event];
		                }

			                return greyColor;
		            });
	        },
        },
        {
	        title: 'Time Interval',
	        action(elm, d) {
	            const box = d.id;
	            d3.selectAll('.node')
		            .transition()
		            .duration(200)
		            .style('stroke', 'black')
		            // eslint-disable-next-line no-shadow
		            .style('stroke-width', (d) => {
                        //		    console.log(box, d.box, d.timeInterval, maxTimeInterval[d.box]);
		                if (d.box == box) {
			                if (d.timeInterval / maxTimeInterval[d.box] > 0.1) {
			                    return 1;
			                }

			                    // eslint-disable-next-line no-mixed-operators
			                    return 0.5 + (d.timeInterval) / maxTimeInterval[box];
		                }

			                return 0.1;
		            })
		            // eslint-disable-next-line no-shadow
		            .style('opacity', (d) => {
		                if (d.box == box) {
			                if (d.timeInterval / maxTimeInterval[d.box] > 0.1) {
			                    return 1;
			                }

			                    // eslint-disable-next-line no-mixed-operators
			                    return 0.5 + (d.timeInterval) / maxTimeInterval[box];
		                }
		            });
	        },
        },
    ];

    // create the div element that will hold the context menu
    d3.selectAll('.d3-context-menu').data([1])
	    .enter()
	    .append('div')
	    .attr('class', 'd3-context-menu');

    // close menu
    d3.select('body').on('click.d3-context-menu', () => {
	    d3.select('.d3-context-menu').style('display', 'none');
    });

    // this gets executed when a contextmenu event occurs
    // eslint-disable-next-line func-names
    return function (data, index) {
	    const elm = this;

	    d3.selectAll('.d3-context-menu').html('');
	    const list = d3.selectAll('.d3-context-menu').append('ul');
	    list.selectAll('li').data(menu).enter()
	        .append('li')
	        .html(d => d.title)
	        .on('click', (d) => {
		        d.action(elm, data, index);
		        d3.select('.d3-context-menu').style('display', 'none');
	        });

	    // the openCallback allows an action to fire before the menu is displayed
	    // an example usage would be closing a tooltip
	    if (openCallback) openCallback(data, index);

	    // display context menu
	    d3.select('.d3-context-menu')
	        .style('left', `${d3.event.pageX - 2}px`)
	        .style('top', `${d3.event.pageY - 2}px`)
	        .style('display', 'block');

	    d3.event.preventDefault();
    };
}
