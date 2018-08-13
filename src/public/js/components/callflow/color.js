export default class Color {
    constructor(scale) {
        this.colorScale = scale || d3.scale.category20()
        this.incColorScale = null
        this.excColorScale = null
        this.nRangeColorScale = null
        this.diffColorScale = null
        this.colorOption = 1
        this.colors = ["red", "green", "yellow", "blue", "black", "white"]
    }

    setColorScale (minInc, maxInc, minExc, maxExc){
	console.log(minInc, maxInc, minExc, maxExc);
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

    getColor(node, colorOption){
        if(colorOption == undefined){
            colorOption = 1
        }
	if(colorOption == 0){
	    return this.colorScale(node.name.replace(/ .*/, ""));
	    // return color(node["specialID"]);
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
    }
}
