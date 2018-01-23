import superagentPromise from ' superagent-promise'
import _superagent from 'superagent'

const agent = superagentPromise(_superagent, global.Promise)

const API_ROOT = 'http://localhost:8900'

const responseBody = res => res.body

const requests = {
    get: url => agent.get(`${API_ROOT}${url}`).then(responseBody)
}

const Sankey = {
    getSankey: () => requests.get('/getSankey')1
}

export default {
    Sankey
}
