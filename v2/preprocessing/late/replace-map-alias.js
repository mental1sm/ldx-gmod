const G = require('../global')
const UTIL = require('../p-util')

function replaceScopedAlias(str, alias, prefix, currentDepth) {
  return str.replace(new RegExp(`\\${alias}(\\d*)`, 'g'), (_, num) => {
    return num && num !== '' ? `${prefix}${num}` : `${prefix}${currentDepth}`
  })
}

const replaceAliasInProps = (_props, alias, prefix, currentDepth) => {
  Array.from(_props).forEach(props => {
    Object.entries(props).forEach(([_, propContent]) => {
      if (typeof propContent.value === 'string') {
        propContent.value = replaceScopedAlias(propContent.value, alias, prefix, currentDepth)
      }
    })
  })
}



function replaceMapAliases(node) {
  const depth = node.context.mapScope.scopeDepth
  const DEPTH_INDEX_PREFIX = G.INDEX_PREFIX
  const DEPTH_ITEM_PREFIX = G.ITEM_PREFIX

  function scoped(str) {
    if (typeof str !== 'string') return str
    str = replaceScopedAlias(str, G.MAP_INDEX_ALIAS, DEPTH_INDEX_PREFIX, depth)
    str = replaceScopedAlias(str, G.MAP_ITEM_ALIAS, DEPTH_ITEM_PREFIX, depth)
    return str
  }

  if (node.type === 'map' || node.type === 'reactive_map') {
      node.body = scoped(node.body)
  }
  if (node.type === 'if' && node.context.mapScope.inMap) {
      node.body = scoped(node.body)
  }

  if (node.type === 'element' && node.context.mapScope.inMap) {
      node.varName = scoped(node.varName)
      replaceAliasInProps([node.commonProps, node.reactiveProps, node.internalProps], G.MAP_INDEX_ALIAS, DEPTH_INDEX_PREFIX, depth)
      replaceAliasInProps([node.commonProps, node.reactiveProps, node.internalProps], G.MAP_ITEM_ALIAS, DEPTH_ITEM_PREFIX, depth)
  }

  if (node.type === 'inline' && node.context.mapScope.inMap) {
      node.code = scoped(node.code)
  }

  if (node.type === 'snippet' && node.context.mapScope.inMap) {
      node.args = Object.entries(node.args).reduce((acc, [argName, argValue]) => {
          acc[argName] = scoped(argValue)
          return acc
      }, {})
  }

  if (node.children) node.children.forEach(child => replaceMapAliases(child))
}


module.exports = {
    replaceMapAliases: replaceMapAliases
}