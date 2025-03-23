const G = require('../global')
const UTIL = require('../p-util')
//----------- REACTIVE MAP ------------------------------------------
function buildReactiveMaps(node) {
    if (node.type === 'reactive_map') {
      const mapStoreName = `REACTIVE_MAP_STORE_${G.varCounter++}`
      const mapStore = UTIL.makeSnippet(G.SNIPPETS.CREATE_EMPTY_TABLE, {name: mapStoreName, isLocal: true})
      mapStore.context = {...G.DEFAULT_CONTEXT, mapScope: node.context.mapScope}
  
      const renderFunctionName = `_render_${G.varCounter++}`
      const renderFunction = UTIL.makeSnippet(G.SNIPPETS.CREATE_FUNCTION, {name: renderFunctionName, args: "$INDEX, $ITEM"})
      renderFunction.context = {...G.DEFAULT_CONTEXT, mapScope: node.context.mapScope}
      const someMapChild = node.children[0]
  
      if (someMapChild) {
        someMapChild.context.wrapSelfGroupWithNode(renderFunction)
        node.children = [mapStore, renderFunction]
      
        UTIL.applyRecursivly(node, el => {
          el.context = {
            ...el.context, mapScope: {...el.context.mapScope, mapStores: [
              ...el.context.mapScope.mapStores, 
              {mapStore: mapStoreName, depth: node.context.mapScope.scopeDepth, dependency: node.body.replace('@', '')}
            ]},
            reactiveMapDependency: node.body.replace('@', '')
          }
        })
      }
    }
    if (node.children) node.children.forEach(child => buildReactiveMaps(child))
  }
  
  
  function replaceReactiveMapAliasesInProps(node) {
    if (node.type === 'element' && node.context.mapScope.inMap && node.context.mapScope.isReactive) {
      Object.entries(node.reactiveProps).forEach(([key, propContent]) => {
        const scope = node.context.mapScope
        const filteredStores = Object.entries(scope.mapStores).filter(([key, val]) => val.depth === scope.scopeDepth).map(([key, val]) => val)
        const store = filteredStores.length ? filteredStores[0] : null
        if (!store) {
          throw new MapStoreError(`[REACTIVE_MAP] mapStore on depth ${scope.scopeDepth} was not found!`);
        }
        propContent.value = propContent.value.replaceAll('$ITEM', `${store.dependency}[$INDEX${scope.scopeDepth}]`)
        propContent.dependencies.push(store.dependency)
      });
    }
    if (node.children) node.children.forEach(child => replaceReactiveMapAliasesInProps(child))
  }
  
  function generateUpdateFunctionForReactiveMaps(node) {
    if (node.type === 'element' && node.context.mapScope.inMap) {
      const mapStore = UTIL.findCurrentMapStore(node)
      node.subscriptions.forEach(rod => {
        // if (rod.name === node.context.reactiveMapDependency && node.reactiveProps) {
        //   Object.values(node.reactiveProps).forEach(val => {
        //     if (val.value?.includes(G.INDEX_PREFIX)) {
        //       val.dependencies = [rod.name];
        //     }
        //   });
        // }

        console.log(node.context.mapScope)

        Object.values(node.reactiveProps).forEach(val => {
          if (val.dependencies.includes('$ITEM')) {
            val.dependencies = [mapStore.dependency];
          }
        });
  
        const underlayingReactiveProps = Object.fromEntries(
          Object.entries(node.reactiveProps || {}).filter(([_, prop]) => prop.dependencies?.includes(rod.name))
        )
        
        console.log(rod)
        console.log(node.reactiveProps)
        console.log(underlayingReactiveProps)

        const updateFunctionSnippet = UTIL.makeSnippet(G.SNIPPETS.CREATE_UPDATE_FUNCTION, {
          name: `${node.varName}.${G.UPDATE_METHOD_AFFIX}${rod.name}`,
          elementName: node.varName,
          elementTag: node.tag,
          reactiveDependency: rod.name,
          reactiveProps: underlayingReactiveProps
        })
  
        updateFunctionSnippet.context = {...G.DEFAULT_CONTEXT, mapScope: {...node.context.mapScope}}
        node.context.pushNodeToParentChildrenSectionEnd(updateFunctionSnippet)
      })
    }
    if (node.children) node.children.forEach(generateUpdateFunctionForReactiveMaps)
  }
  
  function manageReactiveMapVariables(node) {
    if (node.type === 'element' && node.context.mapScope.inMap) {
      const scope = node.context.mapScope
      const filteredStores = Object.entries(scope.mapStores).filter(([key, val]) => val.depth === scope.scopeDepth).map(([key, val]) => val)
      const store = filteredStores.length ? filteredStores[0] : 'DEPTH_ERROR'
      node.varName = `${store.mapStore}[$INDEX]`
      node.context.isLocal = false
    }
    if (node.children) node.children.forEach(child => {manageReactiveMapVariables(child)})
  }
  //-------------------------------------------------------------------

module.exports = {
  buildReactiveMaps: buildReactiveMaps,
  replaceReactiveMapAliasesInProps: replaceReactiveMapAliasesInProps,
  generateUpdateFunctionForReactiveMaps: generateUpdateFunctionForReactiveMaps,
  manageReactiveMapVariables: manageReactiveMapVariables
}