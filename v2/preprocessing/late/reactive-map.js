const G = require('../global')
const UTIL = require('../p-util')
//----------- REACTIVE MAP ------------------------------------------
function buildReactiveMaps(node) {
    if (node.type === 'reactive_map') {
      const reactiveDependency = node.body.replace('@', '')
      
      const mapStoreName = `REACTIVE_MAP_STORE_${G.varCounter++}`
      const mapStore = UTIL.makeSnippet(G.SNIPPETS.CREATE_EMPTY_TABLE, {name: mapStoreName, isLocal: true})
      mapStore.context = {...G.DEFAULT_CONTEXT, mapScope: node.context.mapScope}

      const saveLastValueSnippet = UTIL.makeSnippet(G.SNIPPETS.ADD_ITEM_TO_TABLE, {table: mapStoreName, key: '"INTERNAL_LAST_VAL"', value: reactiveDependency + ".value"})
      saveLastValueSnippet.context = {...node.context}

      const renderFunctionName = `_render_${G.varCounter++}`
      const renderFunction = UTIL.makeSnippet(G.SNIPPETS.CREATE_FUNCTION, {name: renderFunctionName, args: "$INDEX, $ITEM"})
      renderFunction.context = {...G.DEFAULT_CONTEXT, mapScope: node.context.mapScope}
      const someMapChild = node.children[0]

      const updateHandlerFn = UTIL.makeSnippet(G.SNIPPETS.SUBSCRIBE_FN_ONLY, 
        {
          name: G.UNSUBSCRIBE_ARRAY + `["${mapStoreName}_${reactiveDependency}"]`, 
          reactiveDependency: reactiveDependency,
          func: G.LDX_UPDATE_HANDLER,
          args: ["state", mapStoreName, renderFunctionName],
          validator: node.parent
      })
      updateHandlerFn.context = {...node.context}
  
      if (someMapChild) {
        someMapChild.context.wrapSelfGroupWithNode(renderFunction)

        const iteratorSnippet = UTIL.makeSnippet(
          G.SNIPPETS.CREATE_FOR, {indexName: G.MAP_INDEX_ALIAS, itemName: G.MAP_ITEM_ALIAS, iterable: reactiveDependency + ".value"})
        const callRender = UTIL.makeSnippet(G.SNIPPETS.CALL_FUNCTION, {name: renderFunctionName, args: `${G.MAP_INDEX_ALIAS}, ${G.MAP_ITEM_ALIAS}`})
        iteratorSnippet.context = {...G.DEFAULT_CONTEXT, mapScope: node.context.mapScope}
        callRender.context = {...G.DEFAULT_CONTEXT, mapScope: node.context.mapScope}
        iteratorSnippet.children = [callRender]

        node.children = [mapStore, saveLastValueSnippet, renderFunction, iteratorSnippet, updateHandlerFn]
      
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
        const store = UTIL.findCurrentMapStore(node)
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
        Object.values(node.reactiveProps).forEach(val => {
          if (val.dependencies.includes('$ITEM')) {
            val.dependencies = [mapStore.dependency];
          }
        });
  
        const underlayingReactiveProps = Object.fromEntries(
          Object.entries(node.reactiveProps || {}).filter(([_, prop]) => prop.dependencies?.includes(rod.name))
        )

        const updateFunctionSnippetName = `${node.varName}.${G.UPDATE_METHOD_AFFIX}` // name.__update__
        const updateFunctionSnippet = UTIL.makeSnippet(G.SNIPPETS.CREATE_UPDATE_FUNCTION, {
          name: updateFunctionSnippetName,
          elementName: node.varName,
          elementTag: node.tag,
          reactiveDependency: rod.name,
          reactiveProps: underlayingReactiveProps
        })
        updateFunctionSnippet.context = {...G.DEFAULT_CONTEXT, mapScope: {...node.context.mapScope}}
        
        const callUpdateFn = UTIL.makeSnippet(G.SNIPPETS.CALL_FUNCTION, {name: updateFunctionSnippetName, args: [rod.name]})
        callUpdateFn.context = {...updateFunctionSnippet.context}
        updateFunctionSnippet.children = []

        node.context.pushNodeToParentChildrenSectionEnd(updateFunctionSnippet)
        node.context.pushNodeToParentChildrenSectionEnd(callUpdateFn)
      })
    }
    if (node.children) node.children.forEach(generateUpdateFunctionForReactiveMaps)
  }
  
  function manageReactiveMapVariables(node) {
    if (node.type === 'element' && node.context.mapScope.inMap) {
      const store = UTIL.findCurrentMapStore(node)
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