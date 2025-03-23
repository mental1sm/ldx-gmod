const G = require('../global')
const UTIL = require('../p-util')
function replaceParentAlias(node) {
    if (['inline', 'inject'].includes(node.type)) {
        node.code = node.code.replaceAll(G.PARENT_ALIAS, node.parent)
    }
    if (['map', 'if', 'use_effect', 'reactive_map'].includes(node.type)) {
      node.body = node.body.replaceAll(G.PARENT_ALIAS, node.parent)
    }
    if (node.type === 'element') {
        // Replace also in the element props
        UTIL.replaceAliasInProps([node.commonProps, node.reactiveProps, node.internalProps], G.PARENT_ALIAS, node.parent)
    }
    if (node.type === 'snippet') {
      node.args = Object.entries(node.args).reduce((acc, [argName, argValue]) => {
        acc[argName] = typeof argValue === 'string' ? argValue.replaceAll(G.PARENT_ALIAS, node.parent) : argValue
        return acc
      }, {})
    }
    if (node.children) node.children.forEach(child => {replaceParentAlias(child)})
}

module.exports = {
    replaceParentAlias: replaceParentAlias
}