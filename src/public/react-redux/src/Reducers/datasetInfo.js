const datasetInfo = (state = [], action) => {
    switch (action.type){
	
    case 'FETCH_DATASETINFO': {
	return {...state, loaded: true, data: action.payload }
    }

    case 'FETCH_DATASETINFO_FAIL': {
	return {...state, loaded: false, data: action.payload }
    }

    default:
	return state
    }
}

export default datasetInfo

