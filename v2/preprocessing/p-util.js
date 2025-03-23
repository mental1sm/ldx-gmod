function applyRecursivly(node, effect) {
    effect(node)
    if (node.children) node.children.forEach(child => {applyRecursivly(child, effect)})
}

const applyHandlerToNodes = (tree, handler) => {
    tree.forEach(rootNode => {
        if (rootNode.type === 'component') {
          rootNode.elements.forEach(element => {handler(element)})
        }
      })
}

const applyHandlerToRoot = (tree, handler) => {
    tree.forEach(rootNode => {handler(rootNode)})
}

const applyHandlerDirectly = (tree, handler) => {
    handler(tree)
}

const makeSnippet = (snippetType, args) => {
    return {
      type: 'snippet',
      variant: snippetType,
      args: args
    }
  }
  
  const findRootElement = (component) => {
    return component.elements.find(element => element.type === 'element' && element.context.isRoot)
  }
  
  const replaceAliasInProps = (_props, alias, value) => {
    Array.from(_props).forEach(props => {
      Object.entries(props).forEach(([_, propContent]) => {
        propContent.value ? propContent.value = propContent.value.replaceAll(alias, value) : propContent
      })
    })
  }

  const context = require('./context')

  const findCurrentMapStore = (node) => {
    const scope = node.context.mapScope
    const filteredStores = Object.entries(scope.mapStores).filter(([key, val]) => val.depth === scope.scopeDepth).map(([key, val]) => val)
    const store = filteredStores.length ? filteredStores[0] : null
    if (!store) {
      throw new MapStoreError(`[REACTIVE_MAP] mapStore on depth ${scope.scopeDepth} was not found!`);
    }
    return store
  }

module.exports = {
    applyHandlerDirectly: applyHandlerDirectly,
    applyHandlerToNodes: applyHandlerToNodes,
    applyHandlerToRoot: applyHandlerToRoot,
    applyRecursivly: applyRecursivly,
    makeSnippet: makeSnippet,
    findRootElement: findRootElement,
    replaceAliasInProps: replaceAliasInProps,
    context: context,
    findCurrentMapStore: findCurrentMapStore,
}