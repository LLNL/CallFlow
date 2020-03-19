import * as d3 from 'd3'

export function formatName(name) {
    if (name.length < 20) {
        return name
    }
    let ret = this.trunc(name, 20)
    return ret
}

export function formatRuntimeWithUnits(val) {
    let format = d3.format('.2')
    let ret = format(val) + ' \u03BCs'
    return ret
}

export function formatRuntimeWithoutUnits(val){
    let format = d3.format('.2')
    let ret = format(val)
    return ret
}