import tpl from '../../html/auxiliaryFunction/boxplot.html'
import QuartileBox from './quartlieBox'
import Markers from './markers'
import Outliers from './outlier'
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
        parentID:'',
        iqrFactor: 0.15
    }),
    components: {
        QuartileBox,
        Outliers,
        Markers
    },

    mounted() {
        this.id = "boxplot-" + this.callsite.id
        this.init()
    },

    created(){
        this.callsiteID = this.callsite.id
    },

    methods: {
        init() {
            this.containerWidth = this.$parent.boxplotWidth - 2 * this.padding.right - 1 * this.padding.left

            let ensemble_callsite_data = this.$store.callsites['ensemble'][this.callsite.name]

            let target_callsite_data = this.$store.callsites[this.$store.selectedTargetDataset][this.callsite.name]

            // Create a dummy object when a target callsite does not exist
            if (target_callsite_data == undefined) {
                target_callsite_data = {
                    'dataset': [this.$store.selectedTargetDataset],
                    'id': ensemble_callsite_data.id,
                    'max_time': 0,
                    'max_time (inc)': 0,
                    'module': ensemble_callsite_data.module,
                    'name': ensemble_callsite_data.name,
                    'rank': [],
                    'time': [],
                    'time (inc)': []
                }
            }

            this.svg = d3.select('#' + this.id)
                .attrs({
                    'class': 'boxplot',
                    'width': this.containerWidth,
                    'height': this.containerHeight
                })

            this.process(ensemble_callsite_data, target_callsite_data)
            this.visualize()
        },

        process(ensemble_data, target_data) {
            let inc_arr = ensemble_data['time (inc)']
            let exc_arr = ensemble_data['time']

            let inc_arr_target = target_data['time (inc)']
            let exc_arr_target = target_data['time']

            if (this.$store.selectedMetric == 'Inclusive') {
                this.raw_d = inc_arr
                this.d = inc_arr.sort(d3.ascending)
                this.q = this.quartiles(this.d)

                this.raw_target_d = inc_arr_target
                this.targetd = inc_arr_target.sort(d3.ascending)
                this.targetq = this.quartiles(this.targetd)
            }
            else if (this.$store.selectedMetric == 'Exclusive') {
                this.raw_d = exc_arr
                this.d = exc_arr.sort(d3.ascending)
                this.q = this.quartiles(this.d)

                this.raw_target_d = exc_arr_target
                this.targetd = exc_arr_target.sort(d3.ascending)
                this.targetq = this.quartiles(this.targetd)
            }

            this.ensembleWhiskerIndices = this.iqrScore(this.d, this.q)
            this.targetWhiskerIndices = this.iqrScore(this.targetd, this.targetq)

            // Compute the new x-scale.
            this.x1 = d3.scaleLinear()
                .domain([this.q.min, this.q.max])
                .range([0, this.boxWidth]);


        },

        iqrScore(data, q) {
            let q1 = q.q1
            let q3 = q.q3
            let iqr = (q3 - q1) * this.iqrFactor
            let i = 0
            let j = data.length - 1
            while (data[i] < q1 - iqr) {
                i++
            }
            while (data[j] > q3 + iqr) {
                j--
            }
            return [i, j];
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

        quartiles(arr) {
            let result = {}
            if (arr.length == 0) {
                result = {
                    "q1": 0,
                    "q2": 0,
                    "q3": 0,
                    "q4": 0,
                    "min": 0,
                    "max": 0
                }
            }
            else {
                arr.sort(function (a, b) {
                    return a - b;
                })

                let med_pos = this.median(arr)

                let med = 0
                if (med_pos.length == 2) {
                    med = (arr[med_pos[0]] + arr[med_pos[1]]) / 2
                }
                else {
                    med = arr[med_pos[0]]
                }
                let min = arr[0]
                let max = arr[arr.length - 1]

                let q1 = (min + med) / 2;
                let q2 = med
                let q3 = (max + med) / 2
                let q4 = max

                var v1 = Math.floor(q1),
                    v2 = Math.floor(q2),
                    v3 = Math.floor(q3),
                    v4 = Math.floor(q4);

                var rowMax = Math.max(v1, Math.max(v2, Math.max(v3, v4)));
                var rowMin = Math.min(v1, Math.min(v2, Math.min(v3, v4)));

                if (rowMax > max) max = rowMax;
                if (rowMin < min) min = rowMin;

                result = {
                    "q1": v1,
                    "q2": v2,
                    "q3": v3,
                    "q4": v4,
                    "min": min,
                    "max": max
                }
            }
            return result
        },

        visualize() {
            this.$refs.QuartileBox.init(this.q, this.targetq)
            this.$refs.Markers.init(this.q, this.targetq)
            this.$refs.Outliers.init(this.q, this.targetq, this.ensembleWhiskerIndices, this.targetWhiskerIndices, this.d, this.targetd)
            EventHandler.$emit('highlight_dataset', {
                dataset: this.$store.selectedTargetDataset
            })

        },
    }
}