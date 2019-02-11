/* eslint-disable no-param-reassign */
/* eslint-disable no-undef */
/* eslint-disable consistent-return */
export default class Color {
    constructor(view, scale) {
	    console.log(view);
	    this.view = view;
        // eslint-disable-next-line no-undef
        this.colorScale = scale || d3.scale.category20();
        this.incColorScale = null;
        this.excColorScale = null;
        this.nRangeColorScale = null;
        this.diffColorScale = null;
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
    }

    getColor(node) {
	    // eslint-disable-next-line prefer-destructuring
	    const colorOption = this.view.colorOption;
	    if (colorOption == 0) {
	        return this.colorScale(node.name[0].replace(/ .*/, ''));
	    } else if (colorOption == 1) {
	        return this.incColorScale(node.weight);
	    } else if (colorOption == 2) {
	        return this.excColorScale(node.exclusive);
	    }
	    else if (colorOption == 3) {
	        return this.nRangeColorScale(node.nRange);
	    } else if (colorOption == 4) {
	        return this.diffColorScale(node.diff || 0);
	    } else if (colorOption == 5) {
            // eslint-disable-next-line camelcase
            let imbalance_perc = 0;
            if (node.imbalance_perc != undefined) {
                // eslint-disable-next-line prefer-destructuring
                imbalance_perc = node.imbalance_perc[0];
            }
            return this.nRangeColorScale(imbalance_perc);
        }
    }

    setContrast(hex) {
	    const rgb = this.hexToRgb(hex);
	    const o = Math.round(((parseInt(rgb.r) * 299) +
			                (parseInt(rgb.g) * 587) +
                            (parseInt(rgb.b) * 114)) / 1000);

	    return (o > 125) ? '#000' : '#fff';
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
