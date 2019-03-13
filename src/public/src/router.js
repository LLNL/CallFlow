import Vue from 'vue'
import Router from 'vue-router'
import Vuetify from 'vuetify'

Vue.use(Router)
Vue.use(Vuetify)

import 'vuetify/dist/vuetify.min.css'
import 'material-design-icons-iconfont/dist/material-design-icons.css'

import Callflow from './components/callflow'

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Callflow',
      component: Callflow
    },      
  ]
})
