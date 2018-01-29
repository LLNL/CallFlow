const sankey = (state = { loaded: false, data : {} }, action)  => {
    switch (action.type){
	
    case 'FETCH_SANKEY': {
	return {...state, loaded: true, data: action.payload }
    }

    case 'FETCH_SANKEY_FAIL': {
	return {...state, loaded: false, data: action.payload }
    }
    default:
	return state
    }
}

export default sankey
