import { observable, action, computed, autorun } from 'mobx'

import agent from '../agent'

class SankeyStore {
    @observable graph = []
    @observable histogram = []

    @action getSankey () {
	return agent.Sankey.getSankey()
	    .then(data) => console.log(data);
    }
}

export default new SankeyStore();
