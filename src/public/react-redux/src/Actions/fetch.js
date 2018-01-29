import axios from 'axios'

const url = 'http://localhost:8900/'

export const getSankey = () => {
    return function(dispatch){
	axios.get(url + 'reactGetSankey')
	    .then((response) => {
		dispatch({ type: 'FETCH_SANKEY', payload: response.data})
	    })
	    .catch((err) => {
		dispatch({ type: "FETCH_SANKEY_FAIL", payload: err })	
	    })
    }
}

export const getDatasetInfo = () => {
    return function(dispatch){
	axios.get(url + 'reactDataSetInfo')
	    .then((response) => {
		dispatch({ type: 'FETCH_DATASETINFO', payload: response.data })
	    })
	    .catch((err) => {
		dispatch({ type: 'FETCH_DATASETINFO_FAIL', payload: err })
	    })
    }
}
