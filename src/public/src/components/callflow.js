import tpl from '../html/callflow.html'
import Vue from 'vue'
// import Vis from 'vis'
import axios from 'axios'

export default {
  name: 'entry',
  template: tpl,
  components: {
   
  },
  data: () => ({
    socket: null,
    appName: 'Callflow',
    dialog: true,
    socketError: false,
    server: 'localhost:8888',
    isAggregated: true,
    server: 'https://localhost:5000',
    left: false,
   }),

  watch: {
  },

  mounted () {
    axios.get(this.server + '/getSankey')
    .then(res => (this.sankey = response))
  },

  methods: {
    init() {
       console.log(this.sankey)
    },

  
    clear() {
      this.$refs.VisBoard.clear()
    },

    fetchData() {
     
    },
  }
}
