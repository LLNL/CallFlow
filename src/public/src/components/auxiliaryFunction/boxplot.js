import tpl from '../../html/auxiliaryFunction/boxplot.html'
import Box from './box'
import Markers from './markers'
import Outliers from './outlier'
import ToolTip from './tooltip'
import * as d3 from 'd3'
import EventHandler from '../EventHandler'

export default {
    name: "BoxPlot",
    template: tpl,
    props: [
        "callsite",
        "width",
        "height"
    ],
    data: () => ({
        id: '',
        boxContainerID: '',
        markerContainerID: '',
        outlierContainerID: '',
        padding: {
            top: 10,
            bottom: 10,
            left: 10,
            right: 10,
        },
        targetBoxWidth: 0,
        targetBoxHeight: 0,
        targetBoxFill: '',
        targetBoxX: 0,
        targetBoxY: 0,
        containerHeight: 150,
        containerWidth: 0,
        parentID: '',
        informationHeight: 70,
        outlierHeight: 20,
        rectHeight: 0,
        centerLinePosition: 0,
        boxHeight: 0,
        boxWidth: 0
    }),
    components: {
        Box,
        Outliers,
        Markers,
        ToolTip
    },

    mounted() {
        this.id = "boxplot-" + this.callsite.id
        this.init()
    },

    created() {
        this.callsiteID = this.callsite.id
    },

    methods: {
        init() {
            this.containerWidth = this.$parent.boxplotWidth - 2 * this.padding.right - 1 * this.padding.left

            this.svg = d3.select('#' + this.id)
                .attrs({
                    'class': 'boxplot',
                    'width': this.containerWidth,
                    'height': this.containerHeight
                })

            this.boxHeight = this.containerHeight - this.informationHeight
            this.boxWidth = this.containerWidth

            this.boxPosition = this.informationHeight / 2 + this.outlierHeight / 2
            this.centerLinePosition = (this.boxHeight - this.informationHeight / 4) / 2
            this.rectHeight = this.boxHeight - this.informationHeight / 4 - this.outlierHeight / 4

            this.ensemble_data = this.$store.callsites['ensemble'][this.callsite.name][this.$store.selectedMetric]['q']
            this.target_data = this.$store.callsites[this.$store.selectedTargetDataset][this.callsite.name][this.$store.selectedMetric]['q']

            this.process()
            this.visualize()
        },

        process() {
            this.q = this.qFormat(this.ensemble_data)
            this.targetq = this.qFormat(this.target_data)

            // this.ensembleWhiskerIndices = this.iqrScore(this.d, this.q)
            // this.targetWhiskerIndices = this.iqrScore(this.targetd, this.targetq)
        },

        avg(arr) {
            let sum = 0;
            for (let i = 0; i < arr.length; i++) {
                sum += arr[i]
            }
            return sum / arr.length
        },

        median(arr) {
            if (arr.length == 0) return 0
            if (arr.length == 1) return [0]
            let mid = Math.floor(arr.length / 2)
            if (mid % 2) {
                return [mid]
            }
            else {
                return [mid - 1, mid]
            }
        },

        qFormat(arr) {
            let result = {
                "min": arr[0],
                "q1": arr[1],
                "q2": arr[2],
                "q3": arr[3],
                "max": arr[4]
            }
            return result
        },

        visualize() {
            let min_x = Math.min(this.q.min, this.targetq.min)
            let max_x = Math.max(this.q.max, this.targetq.max)

            console.log(this.callsite.name)

            this.xScale = d3.scaleLinear()
                .domain([min_x, max_x])
                .range([0.05 * this.containerWidth, this.containerWidth - 0.05 * this.containerWidth]);

            this.$refs.Box.init(this.q, this.targetq, this.xScale)
            this.$refs.Markers.init(this.q, this.targetq, this.xScale)
            // this.$refs.Outliers.init(this.q, this.targetq, this.ensembleWhiskerIndices, this.targetWhiskerIndices, this.d, this.targetd, this.xScale)

            EventHandler.$emit('highlight_dataset', {
                dataset: this.$store.selectedTargetDataset
            })
        },
    }
}