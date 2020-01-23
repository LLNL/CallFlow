import Vue from 'vue'
import Router from 'vue-router'
import Vuetify from 'vuetify'
import BootstrapVue from 'bootstrap-vue'
import App from './App'
import VueSocketIO from 'vue-socket.io';
import store from './store'
import VueMaterial from 'vue-material'
import 'vue-material/dist/vue-material.min.css'
import 'vue-material/dist/theme/default.css'
// import VFileInput from 'v-file-input'

let socket = new VueSocketIO({
  debug: false,
  // connection: 'http://169.237.6.49:5000',
  connection: "http://localhost:5000",
  vuex: {
      store,
      actionPrefix: 'SOCKET_',
      mutationPrefix: 'SOCKET_'
  },
  // options: { path: "/my-app/" } //Optional options
})

Vue.config.productionTip = false
Vue.use(BootstrapVue)
Vue.use(socket)
Vue.use(Router)
Vue.use(Vuetify)
Vue.use(VueMaterial)
// Vue.use(VFileInput)


import 'vuetify/dist/vuetify.min.css'
import 'material-design-icons-iconfont/dist/material-design-icons.css'

import Callflow from './components/callflow'

let router = new Router({
  routes: [
    {
      path: '/',
      name: 'Callflow',
      component: Callflow
    },
  ]
})

/* eslint-disable no-new */
new Vue({
  store,
  el: '#app',
  router,
  // refer https://github.com/vuejs/vue-router/issues/976 as to why this was commented out
  components: { App },
  template: '<App/>'
})
Vue.config.devtools = true

export default router
