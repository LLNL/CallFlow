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

export function formatRuntimeWithExponent(val, min_exponent=0) {
    let format = d3.format('.2')
    let ret = format(val)
    if(ret == 0){
        return [0, 0, min_exponent]
    }
    let exponent = parseInt(ret.toString().split('e')[1].split('+')[1])
    let multiplier = (parseInt(exponent) - min_exponent)
    let mantessa = ret.toString().split('e')[0]* (10**multiplier)

    return [mantessa.toFixed(2), exponent, min_exponent]
}

export function formatExponent(val){
    let format = d3.format('.2')
    let ret = format(val)    
    let exponent = parseInt(ret.toString().split('e')[1].split('+')[1])
    return exponent
}