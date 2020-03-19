import tpl from '../../html/ensembleScatterplot/tooltip.html'
import * as d3 from 'd3'
import * as utils from '../utils'

export default {
    template: tpl,
    name: 'ToolTip',
    data: () => ({
        id: '',
        textCount: 0,
        textxOffset: 20,
        textyOffset: 20,
        textPadding: 18,
        offset: 10,
        fontSize: 12,
    }),

    methods: {
        init(id) {
            this.id = id
            this.toolTipDiv = d3.select('#' + this.id)
                .append('svg')
                .attr('class', 'toolTipSVG')

            this.toolTipG = this.toolTipDiv.append('g')
            this.height = 80
            this.halfWidth = document.getElementById(this.id).clientWidth /2
            this.halfHeight = document.getElementById(this.id).clientHeight /2

        },

        addText(text) {
            this.toolTipText = this.toolTipG
                .append('text')
                .style('font-family', 'sans-serif')
                .style('font-size', '')
                .attrs({
                    'class': 'toolTipContent',
                    'x': () => {
                        console.log(this.mousePosX, this.halfWidth, document.getElementById(this.id).clientWidth)
                        if (this.mousePosX + this.halfWidth > document.getElementById(this.id).clientWidth) {
                            return (this.mousePosX - this.width) + this.textxOffset + 'px'
                        }
                        return this.mousePosX + this.textxOffset + 'px'
                    },
                    'y': () => {
                        if (this.mousePosY + this.halfHeight > document.getElementById(this.id).clientHeight) {
                            return ((this.mousePosY) + this.textyOffset + this.textPadding * this.textCount) - this.height + 'px'
                        }
                        return (this.mousePosY) + this.textyOffset + this.textPadding * this.textCount + "px";
                    }
                })
                .text(text)
                this.textCount += 1
        },

        trunc(str, n) {
            str = str.replace(/<unknown procedure>/g, 'proc ')
            return (str.length > n) ? str.substr(0, n - 1) + '...' : str;
        },

        info() {
            this.addText('Callsite: ' + this.trunc(this.data.callsite, 10))
            this.addText(this.$store.selectedMetric + ' Time: ' + utils.formatRuntimeWithUnits(this.data.value))
            this.addText('Run: ' + this.data.run)
            this.addText('Desirability: ' + (1 - this.data.undesirability).toFixed(3))
        },

        render(data) {
            this.clear()
            this.width = 19*this.fontSize
            var svgScale = d3.scaleLinear().domain([2, 11]).range([50, 150]);
            this.mousePos = d3.mouse(d3.select('#' + this.id).node())
            this.mousePosX = this.mousePos[0]
            this.mousePosY = this.mousePos[1]
            this.toolTipG.attr('height', svgScale(10) + "px")
            this.toolTipRect = this.toolTipG
                .append('rect')
                .attrs({
                    "class": "toolTipContent",
                    'fill': 'white',
                    "stroke": "black",
                    "rx": "10px",
                    "fill-opacity": 1,
                    "width": this.width,
                    "height": this.height,
                    'x': () => {
                        if (this.mousePosX + this.halfWidth > document.getElementById(this.id).clientWidth) {
                            return (this.mousePosX - this.width) + 'px';
                        }
                        return (this.mousePosX) + 'px';

                    },
                    'y': () => {
                        if (this.mousePosY + this.halfHeight > document.getElementById(this.id).clientHeight) {
                            return (this.mousePosY - this.height) + 'px';
                        }
                        return (this.mousePosY) + "px";
                    }
                })
            this.data = data

            // if (this.mousePosX + this.halfWidth > this.callgraphOverviewWidth) {
            //     this.xOffset = this.mousePosX - this.halfWidth + this.textxOffset
            // } else if (this.mousePosX < this.halfWidth) {
            //     this.xOffset = this.mousePosX + this.textxOffset
            // } else {
            //     this.xOffset = this.mousePosX - this.halfWidth + this.textxOffset
            // }

            // console.log(this.xOffset)

            this.info()
        },

        clear() {
            this.textCount = 0
            d3.selectAll('.toolTipContent').remove()
        },

    }
}