import tpl from '../../html/ensembleScatterplot/tooltip.html'
import * as d3 from 'd3'

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
            this.height = document.getElementById(this.id).clientHeight/4
            this.halfWidth = document.getElementById(this.id).clientWidth /2
        },

        formatRuntime(val) {
            let ret = (val * 0.000001).toFixed(2) + 's'
            return ret
        },

        addText(text) {
            this.toolTipText = this.toolTipG
                .append('text')
                .style('font-family', 'sans-serif')
                .style('font-size', '')
                .attrs({
                    'class': 'toolTipContent',
                    'x': () => {
                        return (this.xOffset - 10) + 'px'
                    },
                    'y': () => {
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
            this.addText(this.$store.selectedMetric + ' Time: ' + this.formatRuntime(this.data.value))
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
                })
                .attrs({
                    'x': () => {
                        if (this.mousePosX + this.halfWidth > document.getElementById(this.id).clientWidth - 25) {
                            return (this.mousePosX - this.width) + 'px';
                        }
                        return (this.mousePosX) + 'px';

                    },
                    'y': () => {
                        return (this.mousePosY) + "px";
                    }
                })
            this.data = data

            if (this.mousePosX + this.halfWidth > this.callgraphOverviewWidth) {
                this.xOffset = this.mousePosX - 200 + this.textxOffset
            } else if (this.mousePosX < 100) {
                this.xOffset = this.mousePosX + this.textxOffset
            } else {
                this.xOffset = this.mousePosX - 200 + this.textxOffset
            }

            this.info()
        },

        clear() {
            this.textCount = 0
            d3.selectAll('.toolTipContent').remove()
        },

    }
}