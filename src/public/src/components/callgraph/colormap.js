import tpl from '../../html/callgraph/edges.html'
import * as d3 from 'd3'
import 'd3-selection-multi'

export default {
    template: tpl,
    name: 'ColorMap',
    components: {

    },

    props: [

    ],

    data: () => ({
        transitionDuration: 1000,
        width: 200,
        height: 70,
        colorScaleHeight: 30,
        colorMin: 0,
        colorMax: 0,
        padding: {
            bottom: 20,
            right: 250,
        }
    }),

    watch: {

    },

    mounted() {},

    methods: {
        init() {
            this.color = this.$store.color
            this.colorMin = this.color.colorMin
            this.colorMax = this.color.colorMax
            this.innerHTMLText = [this.$store.colorMin, this.$store.colorMax];
            this.colorMap = this.color.colorMap
            this.colorPoints = this.color.colorPoints

            let id = this.$parent.id
            this.containerWidth = document.getElementById(id).clientWidth
            this.containerHeight = document.getElementById(id).clientHeight

            this.scaleG = d3.select('#' + id)
                .append('g')
                .attrs({
                    'id': 'colormap',
                })

            this.render()
        },

        render() {
            if (this.color.option == "Module") {

            } else {
                let self = this
                let splits = 100
                let color = this.color.getScale(this.color.option)

                for (let i = 1; i < splits; i += 1) {
                    this.scaleG.append('rect')
                        .attrs({
                            'width': this.width / splits,
                            'height': this.height,
                            'x': i * (this.width / splits),
                            'class':'colormap-rect',
                            'transform': `translate(${this.containerWidth - this.padding.right}, ${this.containerHeight - this.padding.bottom})`,
                            'fill': color(this.colorMax/(splits-i))
                        })
                }

            }


            // if (colorOption > 0) {
            //     for (var i = 0; i < 100; i++) {
            //         // nodeRunData.push(i);
            //         var newSpan = document.createElement('span');
            //         newSpan.style.backgroundColor = spanColor(i);
            //         newSpan.style.display = 'inline-block';
            //         newSpan.style.height = colorScaleHeight + 'px';
            //         newSpan.style.width = '1%';
            //         timeScaleDiv.appendChild(newSpan);
            //     }

            //     var fastSpan = document.createElement('span');
            //     // fastSpan.setAttribute("id", "fastSpan");
            //     fastSpan.style.position = "relative";
            //     fastSpan.style.left = "0";
            //     fastSpan.style.fontSize = "15px";
            //     fastSpan.style.fontFamily = "sans-serif";
            //     fastSpan.style.top = "5px";
            //     fastSpan.innerHTML = innerHTMLText[0];
            //     fastSpan.setAttribute("id", "slowAttr");
            //     timeScaleDiv.appendChild(fastSpan);

            //     var slowSpan = document.createElement('span');
            //     slowSpan.style.position = "absolute";
            //     // slowSpan.style.left = "140";
            //     slowSpan.style.left = "190";
            //     slowSpan.style.fontSize = "15px";
            //     slowSpan.style.fontFamily = "sans-serif";
            //     // slowSpan.style.top = $("#metricColorScale").position().top + colorScaleHeight + 5;// + 5;
            //     slowSpan.style.top = $("#slowAttr").position().top;
            //     slowSpan.innerHTML = innerHTMLText[1];
            //     slowSpan.setAttribute("id", "fastAttr");

            //     console.log($("#metricColorScale").position().top, colorScaleHeight, $("#slowAttr").position().top);


            //     timeScaleDiv.appendChild(slowSpan);
            // }
        },

        clear() {
            this.scaleG.selectAll('.colormap-rect').remove()
        },
    }
}