import Vue from 'vue'
import Vuex from 'vuex'
import {
    mutations,
    STORAGE_KEY
} from './mutations'
import actions from './actions'
import pluginsFunc from './plugins'

Vue.use(Vuex)

let plugins = pluginsFunc()
export default new Vuex.Store({
    state: {
        color: null
    },
    actions,
    mutations,
    plugins
})