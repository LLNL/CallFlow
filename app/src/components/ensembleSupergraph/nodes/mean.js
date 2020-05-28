import * as d3 from 'd3'
import * as utils from '../../utils'

export default {
    template: '<g :id="id"></g>',
    name: 'MeanGradients',
    components: {},

    data: () => ({
        strokeWidth: 7,
        id: 'mean-gradients'
    }),

    methods: {
        init(nodes, containerG) {
            this.nodes = nodes
            this.containerG = containerG

            this.ensemble_module_data = this.$store.modules['ensemble']
            this.ensemble_callsite_data = this.$store.callsites['ensemble']

            this.colorScale()
            this.gradients()
            this.visualize()
        },

        colorScale() {
            let hist_min = 0
            let hist_max = 0
            for (let node of this.nodes) {
                if (node.type == 'super-node') {
                    hist_min = Math.min(hist_min, this.ensemble_module_data[node.module][this.$store.selectedMetric]['gradients']['hist']['y_min'])
                    hist_max = Math.max(hist_max, this.ensemble_module_data[node.module][this.$store.selectedMetric]['gradients']['hist']['y_max'])
                }
                else if (node.type == 'component-node') {
                    hist_min = Math.min(hist_min, this.ensemble_callsite_data[node.name][this.$store.selectedMetric]['gradients']['hist']['y_min'])
                    hist_max = Math.max(hist_max, this.ensemble_callsite_data[node.name][this.$store.selectedMetric]['gradients']['hist']['y_max'])
                }
            }
            this.$store.binColor.setColorScale(hist_min, hist_max, this.$store.selectedDistributionColorMap, this.$store.selectedColorPoint)
            this.$parent.$parent.$refs.EnsembleColorMap.updateWithMinMax('bin', hist_min, hist_max)
        },

        visualize() {
            this.containerG.selectAll('.callsite-rect')
                .data(this.nodes)
                .transition()
                .duration(this.$parent.transitionDuration)
                .attrs({
                    'opacity': d => {
                        console.log(d)
                        if (d.type == "intermediate") {
                            return 0.0
                        }
                        else {
                            return 1.0;
                        }
                    },
                })
                .style('stroke', (d) => {
                    let runtimeColor = ''
                    if (d.type == "intermediate") {
                        runtimeColor = this.$store.color.ensemble
                    }
                    else if (d.type == 'component-node') {
                        if (this.$store.callsites[this.$store.selectedTargetDataset][d.id] != undefined) {
                            runtimeColor = d3.rgb(this.$store.color.getColor(d));
                        }
                        else {
                            runtimeColor = this.$store.color.ensemble
                        }
                    }
                    else if (d.type == 'super-node') {
                        if (this.$store.modules[this.$store.selectedTargetDataset][d.id] != undefined) {
                            runtimeColor = d3.rgb(this.$store.color.getColor(d));
                        }
                        else {
                            runtimeColor = this.$store.color.ensemble
                        }
                    }
                    return runtimeColor
                })
                .style('stroke-width', (d) => {
                    if (d.type == "intermediate") {
                        return 1
                    }
                    else {
                        return this.stroke_width;
                    }
                })
                .style("fill", (d, i) => {
                    if (d.type == "intermediate") {
                        return this.$store.color.target
                    }
                    else if (d.type == 'super-node') {
                        if (this.$store.modules[this.$store.selectedTargetDataset][d.id] == undefined) {
                            return this.intermediateColor
                        }
                        else {
                            return "url(#mean-gradient" + d.client_idx + ")"
                        }
                    }
                    else if (d.type == 'component-node') {
                        if (this.$store.callsites[this.$store.selectedTargetDataset][d.name] == undefined) {
                            return this.intermediateColor
                        }
                        else {
                            return "url(#mean-gradient" + d.client_idx + ")"
                        }
                    }
                })
        },

        //Gradients
        clearGradients() {
            this.svg.selectAll('.mean-gradient').remove()
        },

        clear() {
        },
    }
}