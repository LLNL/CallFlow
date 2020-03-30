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

    let exponent = 0
    let multiplier = 0
    let mantessa = 0
    console.log("Ret: ", ret)
    if(ret.indexOf('e') != -1){
        let split_ret_by_e = ret.toString().split('e')
        console.log(split_ret_by_e)

        exponent = parseInt(split_ret_by_e[1].split('+')[1])
        console.log(min_exponent, exponent)
        multiplier = parseInt(exponent) - min_exponent
        mantessa  = parseFloat(split_ret_by_e[0]* (10**multiplier))
    }

    console.log(exponent, mantessa, multiplier)

    return [mantessa.toFixed(2), exponent, min_exponent]
}

export function formatExponent(val){
    let format = d3.format('.2')
    let ret = format(val)    
    let exponent = ret
    if(ret.indexOf('e') != -1){
        exponent = parseInt(ret.toString().split('e')[1].split('+')[1])
    }
    return exponent
}

export function measureText(string, fontSize = 10) {
    const widths = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0.2796875,0.2765625,0.3546875,0.5546875,0.5546875,0.8890625,0.665625,0.190625,0.3328125,0.3328125,0.3890625,0.5828125,0.2765625,0.3328125,0.2765625,0.3015625,0.5546875,0.5546875,0.5546875,0.5546875,0.5546875,0.5546875,0.5546875,0.5546875,0.5546875,0.5546875,0.2765625,0.2765625,0.584375,0.5828125,0.584375,0.5546875,1.0140625,0.665625,0.665625,0.721875,0.721875,0.665625,0.609375,0.7765625,0.721875,0.2765625,0.5,0.665625,0.5546875,0.8328125,0.721875,0.7765625,0.665625,0.7765625,0.721875,0.665625,0.609375,0.721875,0.665625,0.94375,0.665625,0.665625,0.609375,0.2765625,0.3546875,0.2765625,0.4765625,0.5546875,0.3328125,0.5546875,0.5546875,0.5,0.5546875,0.5546875,0.2765625,0.5546875,0.5546875,0.221875,0.240625,0.5,0.221875,0.8328125,0.5546875,0.5546875,0.5546875,0.5546875,0.3328125,0.5,0.2765625,0.5546875,0.5,0.721875,0.5,0.5,0.5,0.3546875,0.259375,0.353125,0.5890625]
    const avg = 0.5279276315789471
    return string
      .split('')
      .map(c => c.charCodeAt(0) < widths.length ? widths[c.charCodeAt(0)] : avg)
      .reduce((cur, acc) => acc + cur) * fontSize
  }