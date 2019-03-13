import tpl from '../html/callflow.html'
import axios from 'axios'
import Callgraph from './callgraph'
import Icicle from './icicle'

export default {
  name: 'entry',
  template: tpl,
  components: {
   Callgraph,
   Icicle
  },
  data: () => ({
    socket: null,
    appName: 'Callflow',
    dialog: true,
    socketError: false,
    server: 'localhost:8888',
    isAggregated: true,
    server: 'http://localhost:5000',
    config: {
      headers: {'Access-Control-Allow-Origin': '*'}
    },
    left: false,
    formats: ['Callgraph', 'CCT'],
    selectedFormat: 'Callgraph',
    filterBy: ['Inclusive', 'Exclusive'],
    selectedFilterBy: 'Inclusive',
    filterPerc: [0, 100],
    callgraphData: null, 
    cctData: null,
   }),

  watch: {
  },

  mounted (){
    this.fetchData()
  },

  methods: {
    init() {
      console.log("Data for", this.selectedFormat, ": ", this.callgraphData)
      this.$refs.Callgraph.init(this.callgraphData)
    },

    clear() {
      this.$refs.Callgraph.clear()
    },

    send(path, callback) {
      axios.get(this.server + '/' + path, this.config)
      .then(res => {
        let data = res.data
        callback(data)
      })
    },

    fetchData() {
      if(this.selectedFormat == 'Callgraph'){
        this.send('getSankey', (data) => {
          this.callgraphData = data[0]
          this.init()
        })
        
      }
      else if (this.selectedFormat == 'CCT'){
        this.send('/getCCT', (data) => {
          this.cctData = data[0]
          this.init()
        })
        
      }
    },

    updateFormat(){
      this.fetchData()
    },
  }
}
