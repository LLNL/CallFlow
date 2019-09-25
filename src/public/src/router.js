import Vue from 'vue'
import Router from 'vue-router'
import Vuetify from 'vuetify'
import BootstrapVue from 'bootstrap-vue'
import App from './App'
import VueSocketio from 'vue-socket.io-extended';
import io from 'socket.io-client'
import store from './store'

Vue.config.productionTip = false
Vue.use(BootstrapVue)
Vue.use(VueSocketio, io('http://localhost:5000/'))
Vue.use(Router)
Vue.use(Vuetify)

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