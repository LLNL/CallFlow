export default class Color {
    constructor(view, scale) {
	    console.log(view)
	    this.view = view
        this.colorScale = scale || d3.scale.category20()
        this.incColorScale = null
        this.excColorScale = null
        this.nRangeColorScale = null
        this.diffColorScale = null   
        this.colors = ["red", "green", "yellow", "blue", "black", "white"]
    }

    setColorScale (minInc, maxInc, minExc, maxExc){
        if(!minInc){
            minInc = 0
        }
        if(!maxInc){
            maxInc = Number.MAX_SAFE_INTEGER
        }
        if(!minExc){
            minInc = 0
        }
        if(!maxExc){
            maxExc = Number.MAX_SAFE_INTEGER
        }

        this.incColorScale = chroma.scale('OrRd').padding([0.2, 0])
	        .domain([minInc, maxInc]);
	    
	    this.excColorScale = chroma.scale('OrRd').padding([0.2, 0])
	        .domain([minExc, maxExc]);

	    this.nRangeColorScale = chroma.scale('OrRd').padding([0.2, 0])
	        .domain([ 0, 1 ]);

	    this.diffColorScale = chroma.scale('RdYlBu').domain([-1, 1]);
    }
    
    getColor(node){
	    let colorOption = this.view.colorOption
	    if(colorOption == 0){
	        return this.colorScale(node.name[0].replace(/ .*/, ""));
	    }
	    else if(colorOption == 1){
	        return this.incColorScale(node.weight);
	    }
	    else if(colorOption == 2){
	        return this.excColorScale(node.exclusive);
	    }	
	    else if(colorOption == 3){
	        return this.nRangeColorScale(node.nRange);
	    }
	    else if(colorOption == 4){
	        return this.diffColorScale(node.diff || 0);
	    }
        else if(colorOption == 5){
            let imbalance_perc = 0;
            if(node.imbalance_perc != undefined){
                imbalance_perc = node.imbalance_perc[0]
            }
            return this.nRangeColorScale(imbalance_perc)
        }
    }

    setContrast(hex){
	    let rgb = this.hexToRgb(hex)
	    var o = Math.round(((parseInt(rgb['r']) * 299) +
			                (parseInt(rgb['g']) * 587) +
                            (parseInt(rgb['b']) * 114)) / 1000);
	    
	    return (o > 125) ? '#000' : '#fff';
    }

    hexToRgb(hex) {
	    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	    return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
	    } : null;
    }

}
