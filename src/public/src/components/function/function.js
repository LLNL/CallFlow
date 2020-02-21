import tpl from '../../html/function/index.html'
import * as  d3 from 'd3'

export default {
    name: 'Function',
    template: tpl,
    components: {
    },

    data: () => ({
        graph: null,
        id: 'function-overview',
        padding: {
            top: 10, right: 10, bottom: 10, left: 10
        },
        width: null,
        height: null,
        id: '',
        textxOffset: 10,
        textyOffset: 10,
        textPadding: 0,
        textCount: 0,
        textSize: 15,
        message: "Callsite Information",
        number_of_callsites: 0,
    }),

    sockets: {
        splitcaller(data) {
            console.log("Split caller graph", data)
        }
    },

    methods: {
        init() {
            if (!this.firstRender) {
                this.clear()
            }
            else {
                this.firstRender = false
            }
            this.number_of_callsites = Object.keys(this.$store.callsites[this.$store.selectedTargetDataset]).length
            for (const [idx, callsite] of Object.entries(this.$store.callsites[this.$store.selectedTargetDataset])) {
                this.ui(callsite.name)
                // this.visualize(callsite.name)
            }
        },

        clear() {
            var els = document.querySelectorAll('.auxiliary-node')
            for (var i = 0; i < els.length; i++) {
                els[i].parentNode.innerHTML = ''
            }
        },

        trunc(str, n) {
            str = str.replace(/<unknown procedure>/g, 'proc ')
            return (str.length > n) ? str.substr(0, n - 1) + '...' : str;
        },

        ui(callsite_name) {
            let callsite = this.$store.callsites[this.$store.selectedTargetDataset][callsite_name]

            let container = document.createElement('div')
            let div = document.createElement('div')
            div.style.width = (document.getElementById('function-overview').clientWidth - 20) + 'px'
            div.setAttribute('id', callsite.id)
            div.setAttribute('class', 'auxiliary-node')

            let checkbox = this.createCheckbox(callsite)
            let callsite_label = this.createLabel("".concat(this.trunc(callsite.name, 25)))

            let time_inc = callsite["mean_time (inc)"].toFixed(2)
            let inclusive_runtime = this.createLabel("".concat("Inclusive Runtime (mean): ", (time_inc * 0.000001).toFixed(2), "s"));
            let time = callsite["mean_time"].toFixed(2)
            let exclusive_runtime = this.createLabel("".concat("Exclusive Runtime (mean): ", (time * 0.000001).toFixed(2), "s"));


            div.appendChild(checkbox);
            div.appendChild(callsite_label);
            div.appendChild(inclusive_runtime);
            div.appendChild(exclusive_runtime);

            container.appendChild(div)
            let maxHeight = window.innerHeight - document.getElementById('toolbar').clientHeight - document.getElementById('footer').clientHeight
            document.getElementById('function-overview').style.maxHeight = maxHeight + "px"

            document.getElementById('function-overview').append(container);

        },


        // UI supportign functions.
        createLabel(text) {
            let div = document.createElement('div')
            let label = document.createElement("div");
            let textNode = document.createTextNode(text);
            label.appendChild(textNode);
            div.appendChild(label)
            return label
        },

        createCheckbox(callsite) {
            let div = document.createElement('div')
            let container = document.createElement("div");
            let checkbox = document.createElement("button");
            checkbox.name = callsite.name
            checkbox.module = callsite.module
            checkbox.node_name = callsite.name
            checkbox.setAttribute('class', "reveal-button");
            checkbox.innerHTML = 'Reveal'
            // container.appendChild(textNode)
            checkbox.onclick = function (event) {
                event.stopPropagation()
                let modules = this.module
                let callsite = this.name

                this.$socket.emit('dist_hierarchy', {
                    module: modules,
                    datasets: this.$store.runNames,
                })

                this.$socket.emit('ensemble_histogram', {
                    datasets: this.$store.runNames,
                    module: modules,
                    name: callsite
                })

            }
            container.appendChild(checkbox);
            div.appendChild(container)
            return div
        },

        drawLine() {
            let div = document.createElement('div')
            var newLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            newLine.setAttribute('id', 'line2');
            newLine.setAttribute('x1', '0');
            newLine.setAttribute('y1', '0');
            newLine.setAttribute('x2', '200');
            newLine.setAttribute('y2', '200');
            newLine.setAttribute("stroke", "black")
            div.appendChild(newLine);
            return newLine
        },

        trunc(str, n) {
            str = str.replace(/<unknown procedure>/g, 'proc ')
            return (str.length > n) ? str.substr(0, n - 1) + '...' : str;
        },

        addText(text, isBold = false) {
            this.textCount += 1
            this.toolTipText = d3.select('#' + this.id)
                .data([text])
                .append('text')
                // .attr('type', 'checkbox')
                .style('font-family', 'sans-serif')
                .style('font-weight', (d, i) => {
                    if (isBold) {
                        return '700'
                    }
                    return '400'
                })
                .style('font-size', this.textSize)
                .attrs({
                    'class': 'functionContent',
                    'x': (d, i) => {
                        return this.textxOffset + "px"
                    },
                    'y': () => {
                        return this.textyOffset + this.textPadding * this.textCount + "px";
                    }
                })
                .text((d) => {
                    return d
                })
                .style('pointer-events', 'auto')
                .on('click', (d) => {
                    console.log("Selected split-caller", d)
                    this.$socket.emit('splitcaller', {
                        "name": "split-caller",
                        "dataset1": this.$store.selectedDataset,
                        "split": d
                    })
                })
        },

        render(data) {
            this.clear()

            this.addText('Module: ', true)
            this.addText(this.$store.selectedNode['id'])

            this.addText('Entry functions: ', true)
            let entry_functions = data['entry_functions'][0]
            let callees = data['callees']
            for (const [key, value] of Object.entries(callees[0])) {
                this.addText(key)
            }

            this.addText('Callees: ', true)
            // let callees = data['callees']
            for (const [key, value] of Object.entries(callees[0])) {
                let text = value + '  ->  ' + key
                this.addText(text)
            }

            this.addText('Callers: ', true)
            let callers = data['callers']
            for (const [key, value] of Object.entries(callers[0])) {
                let text = value + '  ->  ' + key
                this.addText(text)
            }
            this.addText('Other Functions: ', true)
            let other_functions = data['other_functions'][0]
            for (let i = 0; i < other_functions.length; i += 1) {
                this.addText(other_functions[i])
            }
        },

        clear() {
            this.textCount = 0
            d3.selectAll('.functionContent').remove()
        },

        update(data) {

        },
    }
}