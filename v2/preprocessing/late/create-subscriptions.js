const G = require('../global')
// We need to generate unique subscription key, subscribe to dependency and then insert into the unsub storage concrete unsub functions
function createSubscriptions(node) {
    if (node.type === 'reactive_map') return
    if (node.type === 'element') {
        const reactiveOriginDeps = node.subscriptions
  
        reactiveOriginDeps.map(rod => {
          const keyProp = Object.entries(node.internalProps).find(([key, _]) => key === 'key')
  
          const underlayingReactiveProps = Object.fromEntries(Object.entries(node.reactiveProps).filter(([_, propContent]) => propContent.dependencies.includes(rod.name)))
  
          // elementName reactiveDependency reactiveProps
          const updateFunctionName = `${G.UPDATE_METHOD_AFFIX}${rod.name}`
          const updateFunctionRedefine = `${node.varName}.${updateFunctionName}`
          const updateFunctionSnippet = G.makeSnippet(G.SNIPPETS.CREATE_UPDATE_FUNCTION, {name: updateFunctionRedefine, elementName: node.varName, elementTag: node.tag, reactiveDependency: rod.name, reactiveProps: underlayingReactiveProps})
          node.context.pushNodeToParentChildrenSectionEnd(updateFunctionSnippet)
  
          // uniqueName elementName reactiveDependency key?
          const unsubscriptionName = `${G.UNSUBSCRIBE_ARRAY}["${G.UNSUBSCRIBE_AFFIX}${node.varName}_${rod.name}"${keyProp ? ` .. ${keyProp[1].value}` : '' }]`
          const subscriptionSnippet = G.makeSnippet(G.SNIPPETS.SUBSCRIBE, 
            {name: unsubscriptionName, elementName: node.varName, reactiveDependency: rod.name, updateCallbackName: updateFunctionName})
          node.context.pushNodeToParentChildrenSectionEnd(subscriptionSnippet)
        })
    }
    if (node.children) node.children.forEach(child => {createSubscriptions(child)})
  }

module.exports = {
    createSubscriptions: createSubscriptions
}