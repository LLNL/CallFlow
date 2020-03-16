export function formatName(name) {
    if (name.length < 20) {
        return name
    }
    let ret = this.trunc(name, 20)
    return ret
}

export function formatRuntime(val) {
    let ret = (val * 0.000001).toFixed(2)
    return ret
}