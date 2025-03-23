const G = require('../global')
function defineVarName(node) {
    if (node.type === 'element') {
        node.varName = `${G.VAR_PREFIX}${G.varCounter++}`
        if (node.children.length) node.children.forEach(child => {defineVarName(child)})
    }
    if (node.type === 'use_effect') {
        node.varName = `_eff${G.VAR_PREFIX}${G.varCounter++}`
    }
    if (['map', 'if', 'reactive_map'].includes(node.type)) {
        if (node.children.length) node.children.forEach(child => {defineVarName(child)})
    }
}

module.exports = {
    defineVarName: defineVarName
}