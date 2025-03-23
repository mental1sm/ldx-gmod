const G = require('../global')
const UTIL = require('../p-util')
// Declares for each root component table of subscribtions and then redefines them OnRemove property to handle unsubscriptions
function handleUnsubscription(tree) {
    tree.forEach(rootNode => {
      if (rootNode.type === 'component') {
        const rootElement = UTIL.findRootElement(rootNode)
        const subscribtionTable = UTIL.makeSnippet(G.SNIPPETS.CREATE_EMPTY_TABLE, {name: G.UNSUBSCRIBE_ARRAY, isLocal: true})
        subscribtionTable.context = {...G.DEFAULT_CONTEXT}
        
        // If root onRemove was customized by user so we need to integrate customization at the OnRemove property
        const rootOnRemove = rootElement.commonProps.onRemove || rootElement.reactiveProps.onRemove
        const onComponentRemove = UTIL.makeSnippet(G.SNIPPETS.CREATE_ON_REMOVE_UNSUBSCRIBE_HANDLER, 
          {elementName: rootElement.varName, unsubscribeName: G.UNSUBSCRIBE_ARRAY, customization: rootOnRemove ? rootOnRemove : '', children: []})
        onComponentRemove.context = {...G.DEFAULT_CONTEXT}
        rootNode.elements = [subscribtionTable, ...rootNode.elements, onComponentRemove]
      }
    })
  } 

module.exports = {
    handleUnsubscription: handleUnsubscription
}