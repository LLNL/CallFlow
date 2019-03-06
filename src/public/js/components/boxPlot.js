/* eslint-disable no-multi-assign */
/* eslint-disable no-undef */
/* eslint-disable func-names */
/* eslint-disable one-var */
/* eslint-disable prefer-const */
// Inspired by http://informationandvisualization.de/blog/box-plot
function d3_box() {
    let width = 1,
        height = 1,
        duration = 0,
        domain = null,
        value = Number,
        whiskers = boxWhiskers,
        quartiles = boxQuartiles,
        showLabels = true, // whether or not to show text labels
        numBars = 4,
        curBar = 1,
        tickFormat = null;

    // For each small multiple…
    function box(g) {
        g.each(function (data, i) {
            let d = data.sort(d3.ascending);
            let g = d3.select(this),
                n = d.length,
                min = d[0],
                max = d[n - 1];

            // Compute quartiles. Must return exactly 3 elements.
            let quartileData = d.quartiles = quartiles(d);

            // Compute whiskers. Must return exactly 2 elements, or null.
            let whiskerIndices = whiskers && whiskers.call(this, d, i),
                whiskerData = whiskerIndices && whiskerIndices.map((i) => { return d[i]; });

            // Compute outliers. If no whiskers are specified, all data are "outliers".
            // We compute the outliers as indices, so that we can join across transitions!
            let outlierIndices = whiskerIndices
                ? d3.range(0, whiskerIndices[0]).concat(d3.range(whiskerIndices[1] + 1, n))
                : d3.range(n);

            // Compute the new x-scale.
            let x1 = d3.scale.linear()
                .domain(domain && domain.call(this, d, i) || [min, max])
                .range([width, 0]);

            // Retrieve the old x-scale, if this is an update.
            let x0 = this.__chart__ || d3.scale.linear()
                .domain([0, Infinity])
            // .domain([0, max])
                .range(x1.range());

            // Stash the new scale.
            this.__chart__ = x1;

            // Note: the box, median, and box tick elements are fixed in number,
            // so we only have to handle enter and update. In contrast, the outliers
            // and other elements are variable, so we need to exit them! Variable
            // elements also fade in and out.

            let flist_width = $('#fList_view').width();

            // Update center line: the vertical line spanning the whiskers.
            let center = g.selectAll('line.center')
                .data(whiskerData ? [whiskerData] : []);

            // horizontal line
            center.enter().insert('line', 'rect')
                .attr('class', 'center')
                .attr('y1', height / 2)
                .attr('y2', height / 2)
                .attr('x1', (d) => {  return x0(d[1]); })
                .attr('x2', (d) => { return x0(d[0]); })
                .style('opacity', 1e-6)
                .transition()
                .duration(duration)
                .style('opacity', 1)
                .attr('x1', (d) => { return x1(d[1]); })
                .attr('x2', (d) => { return x1(d[0]); });

            center.transition()
                .duration(duration)
                .style('opacity', 1)
                .attr('x1', (d) => { return x1(d[1]); })
                .attr('x2', (d) => { return x1(d[0]); });

            center.exit().transition()
                .duration(duration)
                .style('opacity', 1e-6)
                .attr('x1', (d) => {  return x1(d[1]); })
                .attr('x2', (d) => {  return x1(d[0]); })
                .remove();

            // Update innerquartile box.
            let box = g.selectAll('rect.box')
                .data([quartileData]);

            box.enter().append('rect')
                .attr('class', 'box')
                .attr('y', 0)
                .attr('x', (d) => { return x0(d[2]); })
                .attr('height', height - 5)
                .attr('width', (d) => { return Math.abs(x0(d[0]) - x0(d[2])); })
                .transition()
                .duration(duration)
                .attr('x', (d) => { return x1(d[2]); })
                .attr('width', (d) => { return Math.abs(x1(d[0]) - x1(d[2])); });

            box.transition()
                .duration(duration)
                .attr('x', (d) => { return x1(d[2]); })
                .attr('width', (d) => { return x1(d[0]) - x1(d[2]); });

            // Update median line.
            let medianLine = g.selectAll('line.median')
                .data([quartileData[1]]);

            medianLine.enter().append('line')
                .attr('class', 'median')
                .attr('y1', 0)
                .attr('x1', x0)
                .attr('y2', height - 5)
                .attr('x2', x0)
                .transition()
                .duration(duration)
                .attr('x1', flist_width - x1)
                .attr('x2', flist_width - x1)
                .attr('stroke-width', 2);

            medianLine.transition()
                .duration(duration)
                .attr('x1', x1)
                .attr('x2', x1);

            // Update whiskers.
            let whisker = g.selectAll('line.whisker')
                .data(whiskerData || []);

            whisker.enter().insert('line', 'circle, text')
                .attr('class', 'whisker')
                .attr('y1', 0)
                .attr('x1', x0)
                .attr('y2', height)
                .attr('x2', x0)
                .style('opacity', 1e-6)
                .transition()
                .duration(duration)
                .attr('x1', x1)
                .attr('x2', x1)
                .attr('stroke-width', 2)
                .style('opacity', 1);


            whisker.transition()
                .duration(duration)
                .attr('x1', x1)
                .attr('x2', x1)
                .style('opacity', 1);

            whisker.exit().transition()
                .duration(duration)
                .attr('x1', x1)
                .attr('x2', x1)
                .style('opacity', 1e-6)
                .remove();

            // Update outliers.
            let outlier = g.selectAll('circle.outlier')
                .data(outlierIndices, Number);

            outlier.enter().insert('circle', 'text')
                .attr('class', 'outlier')
                .attr('r', 3)
                .attr('cy', height / 2)
                .attr('cx', (i) => { return x0(d[i]); })
                .style('opacity', 1e-6)
                .transition()
                .duration(duration)
                .attr('cx', (i) => { return flist_width - x1(d[i]); })
                .style('opacity', 1)
                .style('fill', '#000');

            outlier.transition()
                .duration(duration)
                .attr('cx', (i) => { return flist_width - x1(d[i]); })
                .style('opacity', 1)
                .style('fill', '#000');

            outlier.exit().transition()
                .duration(duration)
                .attr('cx', (i) => { return flist_width - x1(d[i]); })
                .style('opacity', 1e-6)
                .style('fill', '#000')
                .remove();

            // Compute the tick format.
            let format = tickFormat || x1.tickFormat(2);

            // Update box ticks.
            let boxTick = g.selectAll('text.box')
                .data(quartileData);

            boxTick.enter().append('text')
                .attr('class', 'box')
                .attr('dx', '.3em')
                .attr('dy', (d, i) => { return 10 })
                .attr('y', (d, i) => { return i % 2 ? height : 0 })
                .attr('x', x0)
                .attr('text-anchor', (d, i) => { return 'middle'})
                .text((d) => {
                    return ((d*0.001)/60.0).toFixed(3) + 's'
                })
                .transition()
                .duration(duration)
                .attr('x', x1)
                .attr('fill', (d, i) => { return i % 2 ? '#00B300': '#8F0000'});

            boxTick.transition()
                .duration(duration)
                .text((d) => {
                    return ((d*0.001)/60).toFixed(3) + 's'
                })
                .attr('x', x1)
                .attr('fill', (d, i) => { return i % 2 ? '#00B300': '#8F0000'});

            // Update whisker ticks. These are handled separately from the box
            // ticks because they may or may not exist, and we want don't want
            // to join box ticks pre-transition with whisker ticks post-.
            let whiskerTick = g.selectAll('text.whisker')
                .data(whiskerData);

            whiskerTick.enter().append('text')
                .attr('class', 'whisker')
                .attr('dx', '.3em')
                .attr('dy', 5)
                .attr('y', height)
                .attr('x', x0)
                .attr('text-anchor', (d, i) => { return i % 2 ? 'start': 'end'})
                .text((d) => {
                    return ((d*0.001)/60.0).toFixed(3) + 's'
                })
                .style('opacity', 1e-6)
                .style('color', '#f00')
                .transition()
                .duration(duration)
                .attr('x', x1)
                .style('opacity', 1);

            whiskerTick.transition()
                .duration(duration)
                .text((d) => {
                    return ((d*0.000001)/60.).toFixed(3) + 's'
                })
                .attr('x', x1)
                .style('opacity', 1);

            whiskerTick.exit().transition()
                .duration(duration)
                .attr('x', x1)
                .style('opacity', 1e-6)
                .remove();
        });
        //        d3.timer.flush();
    }

    box.width = function (x) {
        if (!arguments.length) return width;
        width = x;
        return box;
    };

    box.height = function (x) {
        if (!arguments.length) return height;
        height = x;
        return box;
    };

    box.tickFormat = function (x) {
        if (!arguments.length) return tickFormat;
        tickFormat = x;
        return box;
    };

    box.duration = function (x) {
        if (!arguments.length) return duration;
        duration = x;
        return box;
    };

    box.domain = function (x) {
        if (!arguments.length) return domain;
        domain = x == null ? x : d3.functor(x);
        return box;
    };

    box.value = function (x) {
        if (!arguments.length) return value;
        value = x;
        return box;
    };

    box.whiskers = function (x) {
        if (!arguments.length) return whiskers;
        whiskers = x;
        return box;
    };

    box.showLabels = function (x) {
        if (!arguments.length) return showLabels;
        showLabels = x;
        return box;
    };

    box.quartiles = function (x) {
        if (!arguments.length) return quartiles;
        quartiles = x;
        return box;
    };

    return box;
}

function boxWhiskers(d) {
    return [0, d.length - 1];
}

function boxQuartiles(d) {
    return [
        d3.quantile(d, 0.25),
        d3.quantile(d, 0.5),
        d3.quantile(d, 0.75),
    ];
}


export {d3_box,};
