import nodeSize from './control/nodeSize'
import range from './control/range'
import colorBy from './control/colorBy'
import showName from './control/showName'
import colorLegend from './control/colorLegend'
import groupBy from './control/groupBy'

export default class ControlUI {
    constructor() {
        let colorLegendOption = 0
        colorLegend(colorLegendOption)
        showName()
	groupBy()
        colorBy()
        range()
        nodeSize()
    }
}
