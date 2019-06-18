// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import BootstrapVue from 'bootstrap-vue'
import App from './App'
import router from './router'
import VueSocketio from 'vue-socket.io-extended';
import io from 'socket.io-client'

Vue.config.productionTip = false
Vue.use(BootstrapVue)
Vue.use(VueSocketio, io('http://localhost:5000/'))

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  // refer https://github.com/vuejs/vue-router/issues/976 as to why this was commented out
  components: { App },
  template: '<App/>'
})
Vue.config.devtools = true