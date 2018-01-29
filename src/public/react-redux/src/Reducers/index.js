import { combineReducers } from 'redux'
import datasetInfo from './datasetInfo'
import sankey from './sankey'

const vis = combineReducers({
    sankey,
    datasetInfo
});


export default vis
