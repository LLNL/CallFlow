import * as d3 from 'd3';
import {vec2} from 'gl-matrix';
import {tableau10} from './colors';

const svg = d3.select('body')
                .append('svg')
                .attr('class', 'ignore-mouse-event position-fixed histogram')
                .attr('width', window.innerWidth)
                .attr('height', window.innerHeight)
                .attr('background', 'white');

const indicatorLayer = svg.append('g');  // First (bottom)
const histogramLayer = svg.append('g');  // Second (top)

window.addEventListener('resize', () => {
    svg.attr('width', window.innerWidth).attr('height', window.innerHeight);
});

export class Histogram {
    constructor(data,
                cluster,
                featureName,
                targetElement,
                barSize,
                showHistogramIndicator = true,
                offsetX = 0,
                offsetY = 0)
    {
        this.data = data;
        this.cluster = cluster;
        this.featureName = featureName;
        this.targetElement = targetElement;

        this.annotationData = [];

        this.barSize = barSize;
        this.numBins = this.data['target'].length;
        this.maxBinHeight =
            d3.max([d3.max(this.data['others']), d3.max(this.data['target'])]);
        this.padding = {
            'left': 40,
            'top': 10,
            'bottom': 30,
            'right': 10,
        };

        this.innerWidth = this.numBins * this.barSize[0];
        this.innerHeight = this.barSize[1];
        this.width = this.innerWidth + this.padding.left + this.padding.right;
        this.height = this.innerHeight + this.padding.top + this.padding.bottom;

        this.removed = false;
        this.draggable = false;
        this.offset = vec2.fromValues(-this.width / 2 - 30 + offsetX, offsetY);
        this.anchor = vec2.create();
        this.center = vec2.create();

        this.histogram =
            histogramLayer.append('g').attr('class', 'histogram-box');
        this.annotation =
            histogramLayer.append('g').attr('class', 'annotation');
        this.indicator =
            indicatorLayer.append('line').style('stroke', '#767676');

        this.addEvents();
        this.update();

        this.setHistogramIndicatorVisibility(showHistogramIndicator);
    }

    setHistogramIndicatorVisibility(b)
    {
        if (b) {
            this.indicator.attr('display', '');
        }
        else {
            this.indicator.attr('display', 'none');
        }
    }

    toggleDraggable()
    {
        this.setDraggable(!this.draggable);
    }

    setDraggable(b)
    {
        this.draggable = b;
        if (this.draggable) {
            this.histogram.attr('class', 'histogram-box accept-mouse-event');
        }
        else {
            this.histogram.attr('class', 'histogram-box ignore-mouse-event');
        }
    }

    addEvents()
    {
        this.histogram.call(d3.drag().on('drag', () => {
            this.offset[0] += d3.event['dx'];
            this.offset[1] += d3.event['dy'];
            this.updatePosition();
        }));

        this.histogram.on('dblclick', () => {
            this.remove();
        });
    }

    update()
    {
        this.updateHistogram();
        this.updatePosition();
    }

    updatePosition()
    {
        const b = this.targetElement.getBoundingClientRect();
        vec2.set(this.anchor, b.x + b.width / 2, b.y + b.height / 2);
        vec2.add(this.center, this.anchor, this.offset);

        this.histogram.attr('transform',
                            `translate(${this.center[0] - this.width / 2} ${
                                this.center[1] - this.height / 2})`);

        this.annotation.attr('transform',
            `translate(${this.center[0] - this.width / 2}
                       ${this.center[1] - this.height / 2})`);

        this.indicator
            .attr('x1', this.anchor[0])
            .attr('y1', this.anchor[1])
            .attr('x2', this.center[0])
            .attr('y2', this.center[1]);
    }

    updateHistogram()
    {
        const others = this.histogram.append('rect')
                           .attr('class', 'border')
                           .attr('width', this.width)
                           .attr('height', this.height)
                           .attr('fill', 'white')
                           .attr('stroke', '#767676')
                           .attr('stroke-width', 1);
        const x = (d, i) => {
            return this.padding.left + i * this.barSize[0];
        };

        const y = (d, i) => {
            return this.padding.top + this.barSize[1] -
                   d * this.barSize[1] / this.maxBinHeight;
        };

        const h = (d, i) => {
            return d * this.barSize[1] / this.maxBinHeight;
        };

        // Add histogram of others data
        let bars = this.histogram.selectAll('rect.histogram-bar.others')
                       .data(this.data['others']);

        bars.enter()
            .append('rect')
            .merge(bars)
            .attr('class', 'histogram-bar others')
            .attr('x', x)
            .attr('y', y)
            .attr('fill', 'grey')
            .attr('width', this.barSize[0])
            .attr('height', h);
        bars.exit().remove();

        // Add histogram of target data
        bars = this.histogram.selectAll('rect.histogram-bar.target')
                   .data(this.data['target']);
        bars.enter()
            .append('rect')
            .merge(bars)
            .attr('class', 'histogram-bar target')
            .attr('x', x)
            .attr('y', y)
            .attr('fill',
                  () => {
                      if (this.cluster !== -1) {
                          return tableau10[this.cluster % 10];
                      }
                      return 'black';
                  })
            .attr('width', this.barSize[0])
            .attr('height', h);
        bars.exit().remove();

        this.updateLeftAxis();
        this.updateBottomAxis();
    }

    updateLeftAxis()
    {
        const scale = d3.scaleLinear().domain([0, this.maxBinHeight]).range([
            this.innerHeight + this.padding.top, this.padding.top
        ]);

        const axis = this.histogram.append('g');
        axis.attr('transform', `translate(${this.padding.left} 0)`)
            .call(
                d3.axisLeft(scale)
                    .tickSize(3)
                    // .tickFormat(d3.format('.0%'))
                    .tickFormat(d3.format('.2'))
                    .tickValues([0, this.maxBinHeight / 2, this.maxBinHeight]));
        this.histogram.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('class', 'axis-label')
            .attr('fill', 'currentColor')
            .attr('x', this.padding.right - this.width / 2)
            .attr('y', this.padding.bottom / 2 - 4)
            .style('text-anchor', 'middle')
            .text('Relative frequency');
    }

    updateBottomAxis()
    {
        const scale = d3.scalePoint().domain(this.data['bins']).range([
            this.padding.left, this.innerWidth + this.padding.left
        ]);

        const axis = this.histogram.append('g');
        axis.attr('transform',
                  `translate(0 ${this.height - this.padding.bottom})`)
            .call(d3.axisBottom(scale).tickSize(3).tickFormat(d3.format('.2')));

        axis.selectAll('.tick').attr('opacity', (d, i, groups) => {
            return i % 5 == 0 || i == groups.length - 1 ? 1 : 0;
        });
        axis.selectAll('.tick text').attr('opacity', (d, i, groups) => {
            return i % 5 == 0 || i == groups.length - 1 ? 1 : 0;
        });

        this.histogram.append('text')
            .attr('class', 'axis-label')
            .attr('fill', 'currentColor')
            .attr('x', this.padding.left + this.innerWidth / 2 - 10)
            .attr('y', this.height - 4)
            // .attr('y', this.padding.top - 4)
            .style('text-anchor', 'middle')
            .text(this.featureName);
    }

    updateAnnotNumber(number)
    {
        const annotationSize = 15.0;
        const fontSize = annotationSize * 0.9;
        this.annotationData = [number];

        this.annotation.attr('transform',
            `translate(${this.center[0] - this.width / 2}
                       ${this.center[1] - this.height / 2})`);

        const annotCircle = this.annotation.selectAll('circle')
            .data(this.annotationData);
        annotCircle.exit().remove();
        annotCircle
            .enter().append("circle")
                .attr('cx', this.width - annotationSize + 5)
                .attr('cy', annotationSize - 5)
                .attr('r', annotationSize / 2)
                .attr('stroke', 'white')
                .attr('stroke-width', 1)
                .attr('fill', tableau10[this.cluster % 10])
                .attr("pointer-events", "none")
            .merge(annotCircle)
                .attr('cx', this.width - annotationSize + 5)
                .attr('cy', annotationSize - 5)
                .attr('r', annotationSize / 2)
                .attr('stroke', 'white')
                .attr('stroke-width', 1)
                .attr('fill', tableau10[this.cluster % 10])
                .attr("pointer-events", "none");

        const annotText = this.annotation.selectAll('text')
            .data(this.annotationData);
        annotText.exit().remove();
        annotText
            .enter().append("text")
                .attr('x', this.width - annotationSize + 5)
                .attr('y', annotationSize)
                .attr('width', annotationSize)
                .attr('height', annotationSize)
                .attr('fill', 'white')
                .attr('font-size', fontSize)
                .style('text-anchor', 'middle')
                .text((d) => {return d})
                .attr("pointer-events", "none")
            .merge(annotText)
                .attr('x', this.width - annotationSize + 5)
                .attr('y', annotationSize)
                .attr('width', annotationSize)
                .attr('height', annotationSize)
                .attr('fill', 'white')
                .attr('font-size', fontSize)
                .style('text-anchor', 'middle')
                .text((d) => {return d})
                .attr("pointer-events", "none");
    }

    remove()
    {
        this.removed = true;
        this.histogram.remove();
        this.indicator.remove();
        this.annotation.remove();
    }

    show()
    {
    }

    hide()
    {
    }
}
