import nodeSize from './control/nodeSize'
import range from './control/range'
import colorBy from './control/colorBy'
import showName from './control/showName'
import colorLegend from './control/colorLegend'
import loadFile from './control/loadFile'

export default class ControlUI {
    constructor() {
        let colorLegendOption = 0
        loadFile()
        colorLegend(colorLegendOption)
        showName()
        colorBy()
        range()
        nodeSize()
    }
}
