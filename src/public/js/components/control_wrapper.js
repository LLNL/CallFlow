import nodeSize from './control/nodeSize';
import range from './control/range';
import colorBy from './control/colorBy';
import showName from './control/showName';
import groupBy from './control/groupBy';
import { functionListUI } from './functionList';
import graphEmbedding from './control/graphEmbedding';
import icicleControl from './control/icicleControl';

export default class ControlUI {
    constructor(graph, view) {
        //        colorLegend(view.colorOption)
        functionListUI();
        showName(view);
        groupBy(view);
        colorBy(graph, view);
        range(view);
        nodeSize(view);
        graphEmbedding(view);
        icicleControl(view);
    }
}
