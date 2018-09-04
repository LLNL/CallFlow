import nodeSize from './control/nodeSize'
import range from './control/range'
import colorBy from './control/colorBy'
import showName from './control/showName'
import colorLegend from './control/colorLegend'


export default class ControlUI {
    constructor() {
        let colorLegendOption = 0
        colorLegend(colorLegendOption)
        showName()
        colorBy()
        range()
        nodeSize()
    }
}
