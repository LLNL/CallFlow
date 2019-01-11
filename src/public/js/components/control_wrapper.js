import nodeSize from './control/nodeSize'
import range from './control/range'
import colorBy from './control/colorBy'
import showName from './control/showName'
import colorLegend from './control/colorLegend'
import groupBy from './control/groupBy'
import { functionListUI } from './functionList'
import graphEmbedding from './control/graphEmbedding'

export default class ControlUI {
    constructor(graph, view) {
        //        colorLegend(view.colorOption)
        functionListUI()
        showName(view)
	    groupBy(view)
        colorBy(graph, view)
        range(view)
        nodeSize(view)
	graphEmbedding(view)
    }
}
