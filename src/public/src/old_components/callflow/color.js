import * as  d3 from 'd3'
import { scaleOrdinal } from 'd3-scale';
import chroma from 'chroma-js'


export default class Color {
    constructor(colorOption) {
        // eslint-disable-next-line no-undef
        this.colorOption = colorOption
        this.colorScale =  d3.scaleOrdinal(d3.schemeCategory10);        ;
        this.incColorScale = null;
        this.excColorScale = null;
        this.nRangeColorScale = null;
        this.diffColorScale = null;
        this.loadImbColorScale = null;
        this.colors = ['red', 'green', 'yellow', 'blue', 'black', 'white'];
    }

    setColorScale(minInc, maxInc, minExc, maxExc) {
        if (!minInc) {
            // eslint-disable-next-line no-param-reassign
            minInc = 0;
        }
        if (!maxInc) {
            maxInc = Number.MAX_SAFE_INTEGER;
        }
        if (!minExc) {
            minInc = 0;
        }
        if (!maxExc) {
            maxExc = Number.MAX_SAFE_INTEGER;
        }

        // eslint-disable-next-line no-undef
        this.incColorScale = chroma.scale('OrRd').padding([0.2, 0])
	        .domain([minInc, maxInc]);

	    this.excColorScale = chroma.scale('OrRd').padding([0.2, 0])
	        .domain([minExc, maxExc]);

	    this.nRangeColorScale = chroma.scale('OrRd').padding([0.2, 0])
	        .domain([0, 1]);

        this.diffColorScale = chroma.scale('RdYlBu').domain([-1, 1]);

        this.loadImbColorScale = chroma.scale('OrRd').padding([0.2, 0])
            .domain([0, 0.5]);
    }

    getColor(node) {
	    if (this.colorOption == 0) {
	        return this.colorScale(node.name[0].replace(/ .*/, ''));
	    } else if (this.colorOption == 1) {
	        return this.incColorScale(node.weight);
	    } else if (this.colorOption == 2) {
	        return this.excColorScale(node.exclusive);
	    } else if (this.colorOption == 3) {
	        return this.nRangeColorScale(node.nRange);
	    } else if (this.colorOption == 4) {
	        return this.diffColorScale(node.diff || 0);
	    } else if (this.colorOption == 5) {
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

    // eslint-disable-next-line class-methods-use-this
    hexToRgb(hex) {
	    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	    return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
	    } : null;
    }
}
