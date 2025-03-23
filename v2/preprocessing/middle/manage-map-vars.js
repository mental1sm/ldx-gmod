const G = require('../global')
const UTIL = require('../p-util')
// We need to save variables inside of map using the way of saving them into the prepared table
function manageMapVariables(node) {
    if (node.type === 'map') {
      const mapVariableStoreName = `${G.MAP_VARIABLE_STORE_AFFIX}${G.varCounter++}`
      const mapVariableStore = UTIL.makeSnippet(G.SNIPPETS.CREATE_EMPTY_TABLE, {isLocal: true, name: mapVariableStoreName})
      mapVariableStore.context = {...G.DEFAULT_CONTEXT}
      node.context.pushNodeToParentChildrenSectionBegin(mapVariableStore)
      UTIL.applyRecursivly(node, (child) => {
        const scope = child.context.mapScope
        child.context.mapScope = {...scope, mapStores: [...scope.mapStores, {depth: node.context.mapScope.scopeDepth, mapStore: mapVariableStoreName}]}
      })
    }
    if (node.type === 'element' && node.context.mapScope.inMap && !node.context.mapScope.isReactive) {
      const scope = node.context.mapScope
      const filteredStores = Object.entries(scope.mapStores).filter(([key, val]) => val.depth === scope.scopeDepth).map(([key, val]) => val)
      const store = filteredStores.length ? filteredStores[0].mapStore : 'SCOPE_ERROR'
      node.varName = `${store}[$INDEX]`
      node.context.isLocal = false
    }
    if (node.children) node.children.forEach(child => {manageMapVariables(child)})
  }

module.exports = {
    manageMapVariables: manageMapVariables
}