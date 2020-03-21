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

export function formatRuntimeWithExponent(val, set_min_exponent=False, min_exponent=0) {
    let format = d3.format('.2')
    let ret = format(val)
    console.log(ret)
    if(ret == 0){
        return [0]
    }
    
    let exponent = parseInt(ret.toString().split('e')[1].split('+')[1])

    if(set_min_exponent){
        min_exponent = exponent
    }
    let multiplier = (parseInt(exponent) - min_exponent)
    let mantessa = ret.toString().split('e')[0]* (10**multiplier)
    console.log(min_exponent, exponent)

    console.log(mantessa, exponent)
    return [mantessa, exponent, min_exponent]
}