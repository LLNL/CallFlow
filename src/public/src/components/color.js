import * as d3 from 'd3'
import * as chroma from 'chroma-js';

export default class Color {
    constructor(option, scale) {
        this.option = option
        this.incColorScale = null
        this.excColorScale = null;
        this.nRangeColorScale = null;
        this.diffColorScale = null;
        this.loadImbColorScale = null;
        this.colors = ['red', 'green', 'yellow', 'blue', 'black', 'white'];
    }

    setColorScale(min, max) {
        if (this.option == 'Module') {
            this.colorScale = scale || d3.scaleOrdinal(d3.schemeCategory10)
        } else if (this.option == 'Inclusive') {
            this.incColorScale = chroma.scale('OrRd')
                .domain([min, max]);
        } else if (this.option == 'Exclusive') {
            this.excColorScale = chroma.scale('OrRd')
                .domain([min, max]);
        } else if (this.option == 'nRange') {
            this.nRangeColorScale = chroma.scale('RdYlBu').padding([0.2, 0])
                .domain([0, 1])
        } else if (this.option == 'Diff') {
            this.diffColorScale = chroma.scale('RdYlBu').domain([-1, 1]);
        } else if (this.option == 'Imbalance') {
            this.loadImbColorScale = chroma.scale('OrRd')
                .domain([0, 1]);
        }
    }

    getColor(node) {
        if (this.option == "Module") {
            return this.colorScale(node.module);
        } else if (this.option == "Inclusive") {
            if (node.weight == undefined) {
                return this.incColorScale(node.value)
            } else {
                return this.incColorScale(node.weight)
            }
        } else if (this.option == "Exclusive") {
            return this.excColorScale(node.exclusive);
        } else if (this.option == "nRange") {
            return this.nRangeColorScale(node.nRange);
        } else if (this.option == 4) {
            return this.diffColorScale(node.diff || 0);
        } else if (this.option == "Imbalance") {
            return this.loadImbColorScale(node.imbalance_perc);
        }
    }

    setContrast(hex) {
        const rgb = this.hexToRgb(hex);
        const o = Math.round(((parseInt(rgb.r) * 299) +
            (parseInt(rgb.g) * 587) +
            (parseInt(rgb.b) * 114)) / 1000);

        return (o > 128) ? '#000' : '#fff';
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        } : null;
    }
}