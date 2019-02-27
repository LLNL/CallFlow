/* eslint-disable import/prefer-default-export */
/* eslint-disable prefer-const */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-unused-vars */
/* eslint-disable no-prototype-builtins */
/* eslint-disable no-mixed-operators */
/* eslint-disable vars-on-top */
/* eslint-disable no-var */
/* eslint-disable prefer-destructuring */
/* eslint-disable camelcase */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-undef */
/* eslint-disable func-names */
function drawIcicleHierarchy(view, hierarchy) {
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
            path_hierarchy_format[i].push(component_path[i]);
        }
    }
    const json = buildHierarchy(path_hierarchy_format);
    console.log(json);
    drawIcicles(view, json);
}

function buildHierarchy(csv) {
    const root = { name: 'root', children: [] };
    for (let i = 0; i < csv.length; i++) {
        const sequence = csv[i][0];
        const inc_time = csv[i][1];
        const exclusive = csv[i][2];
        const imbalance_perc = csv[i][3];
        const exit = csv[i][4];
        const component_path = csv[i][5];
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
                    component_path,
                    children: [],
                };
                children.push(childNode);
            }
        }
    }
    return root;
}

function clearIcicles(view) {
    $('#iciclehierarchySVG').remove();
}

function drawIcicles(view, json) {
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

    var sliderStep = d3.sliderBottom()
        .min(0)
        .max(10)
        .width(300)
        .tickFormat(d3.format('.2%'))
        .ticks(5)
        .step(0.005)
        .default(0.015)
        .on('onchange', (val) => {
            d3.select('p#value-step').text(d3.format('.2%')(val));
        });

    var gStep = d3
        .select('#iciclehierarchySVG')
        .append('svg')
        .attr('width', 100)
        .attr('height', height)
        .append('g')
        .attr('transform', 'translate(30,30)');

    gStep.call(sliderStep);

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
            if (color._rgb[0] == 204) { return '#9B0011'; }
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
}

// Given a node in a partition layout, return an array of all of its ancestor
// nodes, highest first, but excluding the root.
function getAncestors(node) {
    const path = [];
    let current = node;
    while (current.parent) {
        path.unshift(current);
        current = current.parent;
    }
    return path;
}

function initializeBreadcrumbTrail() {
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
}

// Generate a string that describes the points of a breadcrumb polygon.
function breadcrumbPoints(i) {
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
}

// Update the breadcrumb trail to show the current sequence and percentage.
function updateBreadcrumbs(nodeArray, percentageString) {
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
}

function toggleLegend() {
    const legend = d3.select('#legend');
    if (legend.style('visibility') == 'hidden') {
        legend.style('visibility', '');
    } else {
        legend.style('visibility', 'hidden');
    }
}

export { drawIcicleHierarchy };
