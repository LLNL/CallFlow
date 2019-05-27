import tpl from '../../html/hierarchy.html'
import * as  d3 from 'd3'

export default {
    template: tpl,
    name: 'Hierarchy',
    components: {

    },

    props: [

    ],

    data: () => ({
        currentNodeLevel: {},
        nodeHeights: {},
        nodeWidth: 50,
        transitionDuration: 1000,
        minHeightForText: 10,
        view: {},
    }),

    watch: {

    },

    mounted() {
    },


    methods: {
        init(view, hierarchy) {
            const path = hierarchy.path;
            const inc_time = hierarchy.inc_time;
            const exclusive = hierarchy.exclusive;
            const imbalance_perc = hierarchy.imbalance_perc;
            const exit = hierarchy.exit;
            const component_path = hierarchy.component_path;

            const path_hierarchy_format = [];
            for (const i in path) {
                if (path.hasOwnProperty(i)) {
                    path_hierarchy_format[i] = [];
                    path_hierarchy_format[i].push(path[i]);
                    path_hierarchy_format[i].push(inc_time[i]);
                    path_hierarchy_format[i].push(exclusive[i]);
                    path_hierarchy_format[i].push(imbalance_perc[i]);
                    path_hierarchy_format[i].push(exit[i]);
                    // path_hierarchy_format[i].push(component_path[i]);
                }
            }
            const json = this.buildHierarchy(path_hierarchy_format);
            this.drawIcicles(view, json);
            this.drawSlider(view);
        },

        buildHierarchy(csv) {
            const root = { name: 'root', children: [] };
            for (let i = 0; i < csv.length; i++) {
                const sequence = csv[i][0];
                const inc_time = csv[i][1];
                const exclusive = csv[i][2];
                const imbalance_perc = csv[i][3];
                const exit = csv[i][4];
                // const component_path = csv[i][5];
                const parts = sequence;
                let currentNode = root;
                for (let j = 0; j < parts.length; j++) {
                    const children = currentNode.children;
                    const nodeName = parts[j];
                    var childNode;
                    if (j + 1 < parts.length) {
                        // Not yet at the end of the sequence; move down the tree.
                        let foundChild = false;
                        for (let k = 0; k < children.length; k++) {
                            if (children[k].name == nodeName) {
                                childNode = children[k];
                                foundChild = true;
                                break;
                            }
                        }
                        // If we don't already have a child node for this branch, create it.
                        if (!foundChild) {
                            childNode = { name: nodeName, children: [] };
                            children.push(childNode);
                        }
                        currentNode = childNode;
                    } else {
                        // Reached the end of the sequence; create a leaf node.
                        childNode = {
                            name: nodeName,
                            weight: inc_time,
                            exclusive,
                            imbalance_perc,
                            exit,
                            // component_path,
                            children: [],
                        };
                        children.push(childNode);
                    }
                }
            }
            return root;
        },

        drawSlider(view) {
            let svg = d3.select('#component_graph_view').append('svg'),
                margin = {
                    top: 0, right: 0, bottom: 0, left: 0,
                },
                width = svg.attr('width') - margin.left - margin.right,
                midX = 10,
                height = svg.attr('height') - margin.top - margin.bottom;

            let y = d3.scale.linear()
                .domain([10, 0])
                .range([0, height])
                .clamp(true);

            let brush = d3.svg.brush()
                .y(y)
                .extent([0, 0])
                .on('brush', brushed);

            let g = svg.append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            let slider = g.append('g')
                .attr('transform', `translate(${midX}, 0)`);

            slider.append('g')
                .attr('class', 'y axis')
                .call(d3.svg.axis()
                    .scale(y)
                    .orient('right')
                    .tickFormat(d => `${d}`)
                    .tickSize(0)
                    .tickPadding(13))
                .select('.domain')
                .select(function () { return this.parentNode.appendChild(this.cloneNode(true)); })
                .attr('class', 'halo');

            var prevVal = 0;
            var handle = slider.append('path')
                .attr('class', 'handle')
                .attr('d', 'M-7 -4 L-7 4 L-5 6 L5 6 L11 0 L5 -6 L-5 -6 Z')
                .attr('transform', `translate(0, ${y(prevVal)})`);

            var ruler = slider.append('g')
                .attr('transform', 'translate(-4, 0)')
                .attr('class', 'ruler')
                .call(brush);

            ruler.selectAll('.extent,.resize')
                .remove();

            ruler.select('.background')
                .style('cursor', 'ns-resize')
                .attr('width', 40);

            // initial animation
            ruler.call(brush.event)
                .transition()
                .duration(750)
                .ease('out-in')
                .call(brush.extent([120, 120]))
                .call(brush.event);

            function brushed() {
                var value = brush.extent()[1],
                    t = d3;

                if (d3.event.sourceEvent) { // not a programmatic event
                    value = y.invert(d3.mouse(this)[1]);
                    brush.extent([value, value]);
                    if (d3.event.sourceEvent.type === 'mousemove') {
                        // interrupt transition
                        handle.interrupt();
                    } else if (value != prevVal) {
                        // animate when is't a click, not a drag
                        t = d3.transition()
                            .duration(Math.abs(y(value) - y(prevVal)))
                            .ease('out-in');
                    }
                }

                t.select('.handle')
                    .attr('transform', `translate(0, ${y(value)})`);

                prevVal = value;
            }
        },

        clearIcicles(view) {
            $('#iciclehierarchySVG').remove();
        },

        drawIcicles(view, json) {
            let direction = view.icicleDirection;
            let attr = view.icicleColorByAttr;
            if (view.hierarchy != undefined) {
                clearIcicles(view);
            }
            // Total size of all segments; we set this later, after loading the data
            let totalSize = 0;

            const width = $('#component_graph_view').width();
            const height = $('#component_graph_view').height();

            // eslint-disable-next-line no-param-reassign
            view.hierarchy = d3.select('#component_graph_view').append('svg')
                .attr('width', width)
                .attr('height', height)
                .attr('id', 'iciclehierarchySVG')
                .append('g')
                .attr('id', 'container');

            const partition = d3.layout.partition()
                .size([width, height])
                .value(d => d.weight);

            // Basic setup of page elements.
            // initializeBreadcrumbTrail();
            //  drawLegend();
            d3.select('#togglelegend').on('click', toggleLegend);

            // Bounding rect underneath the chart, to make it easier to detect
            // when the mouse leaves the parent g.
            view.hierarchy.append('svg:rect')
                .attr('width', () => {
                    if (direction == 'LR') return height;
                    return width;
                })
                .attr('height', () => {
                    if (direction == 'LR') return width - 50;
                    return height - 50;
                })
                .style('opacity', 0);


            // For efficiency, filter nodes to keep only those large enough to see.
            const nodes = partition.nodes(json)
                .filter(d => (d.dx > 0.5));

            const node = view.hierarchy.data([json]).selectAll('.icicleNode')
                .data(nodes)
                .enter()
                .append('rect')
                .attr('class', 'icicleNode')
                .attr('x', (d) => {
                    if (direction == 'LR') { return d.y; }
                    return d.x;
                })
                .attr('y', (d) => {
                    if (direction == 'LR') { return d.x; }
                    return d.y;
                })
                .attr('width', (d) => {
                    if (direction == 'LR') { return d.dy; }
                    return d.dx;
                })
                .attr('height', (d) => {
                    if (direction == 'LR') { return d.dx; }
                    return d.dy;
                })
                .style('fill', (d) => {
                    const color = view.color.getColor(d);
                    if (color._rgb[0] == 204) { return '#7A000E'; }
                    return color;
                })
                .style('stroke', () => '#0e0e0e')
                .style('stroke-width', d => '1px')
                .style('opacity', (d) => {
                    if (d.exit) { return 0.5; }
                    return 1;
                })
                .on('mouseover', mouseover);

            const text = view.hierarchy.data([json]).selectAll('.icicleText')
                .data(nodes)
                .enter()
                .append('text')
                .attr('class', 'icicleText')
                .attr('transform', (d) => {
                    if (direction == 'LR') { return 'rotate(90)'; }
                    return 'rotate(0)';
                })
                .attr('x', (d) => {
                    if (direction == 'LR') { return d.y * len(d.component_path); }
                    return d.x + 15;
                })
                .attr('y', (d) => {
                    if (direction == 'LR') { return d.x; }
                    return d.y + 15;
                })
                .attr('width', (d) => {
                    if (direction == 'LR') { return d.dy / 2; } return d.dx / 2;
                })
                .text((d) => {
                    const textTruncForNode = 10;
                    if (d.dy < 10 || d.dx < 50) { return ''; }
                    return d.name.trunc(textTruncForNode);
                });


            // Add the mouseleave handler to the bounding rect.
            d3.select('#container').on('mouseleave', mouseleave);

            // Get total size of the tree = value of root node from partition.
            // eslint-disable-next-line no-underscore-dangle
            totalSize = node.node().__data__.value;

            // Fade all but the current sequence, and show it in the breadcrumb trail.
            function mouseover(d) {
                const percentage = (100 * d.value / totalSize).toPrecision(3);
                let percentageString = `${percentage}%`;
                if (percentage < 0.1) {
                    percentageString = '< 0.1%';
                }

                const sequenceArray = getAncestors(d);
                // updateBreadcrumbs(sequenceArray, percentageString);

                // Fade all the segments.
                d3.selectAll('.icicleNode')
                    .style('opacity', 0.3);

                // Then highlight only those that are an ancestor of the current segment.
                view.hierarchy.selectAll('.icicleNode')
                    // eslint-disable-next-line no-shadow
                    .filter(node => (sequenceArray.indexOf(node) >= 0))
                    .style('opacity', 1);
            }

            // Restore everything to full opacity when moving off the visualization.
            function mouseleave() {
                // Hide the breadcrumb trail
                d3.select('#trail')
                    .style('visibility', 'hidden');

                // Deactivate all segments during transition.
                d3.selectAll('.icicleNode').on('mouseover', null);

                // Transition each segment to full opacity and then reactivate it.
                d3.selectAll('.icicleNode')
                    .transition()
                    .duration(1000)
                    .style('opacity', 1)
                    .each('end', function () {
                        d3.select(this).on('mouseover', mouseover);
                    });
            }
        },

        // Given a node in a partition layout, return an array of all of its ancestor
        // nodes, highest first, but excluding the root.
        getAncestors(node) {
            const path = [];
            let current = node;
            while (current.parent) {
                path.unshift(current);
                current = current.parent;
            }
            return path;
        },

        initializeBreadcrumbTrail() {
            // Add the svg area.
            const width = $('#component_graph_view').width();
            const trail = d3.select('#sequence').append('svg:svg')
                .attr('width', width)
                .attr('height', 50)
                .attr('id', 'trail');
            // Add the label at the end, for the percentage.
            trail.append('svg:text')
                .attr('id', 'endlabel')
                .style('fill', '#000');
        },

        // Generate a string that describes the points of a breadcrumb polygon.
        breadcrumbPoints(i) {
            const points = [];
            points.push('0,0');
            points.push(`${b.w},0`);
            points.push(`${b.w + b.t},${b.h / 2}`);
            points.push(`${b.w},${b.h}`);
            points.push(`0,${b.h}`);
            if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
                points.push(`${b.t},${b.h / 2}`);
            }
            return points.join(' ');
        },

        // Update the breadcrumb trail to show the current sequence and percentage.
        updateBreadcrumbs(nodeArray, percentageString) {
            // Data join; key function combines name and depth (= position in sequence).
            const g = d3.select('#trail')
                .selectAll('g')
                .data(nodeArray, d => d.name + d.depth);

            // Add breadcrumb and label for entering nodes.
            const entering = g.enter().append('svg:g');

            entering.append('svg:polygon')
                .attr('points', breadcrumbPoints)
                .style('fill', () => '#f1f1f1');

            entering.append('svg:text')
                .attr('x', (b.w + b.t) / 2)
                .attr('y', b.h / 2)
                .attr('dy', '0.35em')
                .attr('text-anchor', 'middle')
                .text(d => d.name);

            // Set position for entering and updating nodes.
            g.attr('transform', (d, i) => `translate(${i * (b.w + b.s)}, 0)`);

            // Remove exiting nodes.
            g.exit().remove();

            // Now move and update the percentage at the end.
            d3.select('#trail').select('#endlabel')
                .attr('x', (nodeArray.length + 0.5) * (b.w + b.s))
                .attr('y', b.h / 2)
                .attr('dy', '0.35em')
                .attr('text-anchor', 'middle')
                .text(percentageString);

            // Make the breadcrumb trail visible, if it's hidden.
            d3.select('#trail')
                .style('visibility', '');
        },

        toggleLegend() {
            const legend = d3.select('#legend');
            if (legend.style('visibility') == 'hidden') {
                legend.style('visibility', '');
            } else {
                legend.style('visibility', 'hidden');
            }
        },
    }
}