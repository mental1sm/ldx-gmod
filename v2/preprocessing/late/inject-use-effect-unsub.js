const G = require('../global')
const UTIL = require('../p-util')
// Injects all effect cleanups into the root:OnRemove method
function injectEffectUnsubs(node) {
    if (node.type === 'component') {
      const root = UTIL.findRootElement(node)
      const rootEffects = root.children.filter(n => n.type === 'use_effect')
      const unmountSnippets = node.elements.filter(n => n.type === 'snippet' 
        && n.variant === G.SNIPPETS.CREATE_ON_REMOVE_UNSUBSCRIBE_HANDLER && n.args.elementName === root.varName)
      if (unmountSnippets.length > 0) {
        const rootUnmountSnippet = unmountSnippets[0]
        rootUnmountSnippet.args.children = [
          ...rootUnmountSnippet.args.children, 
          ...rootEffects.map(effect => UTIL.makeSnippet(G.SNIPPETS.CALL_FUNCTION, {name: effect.varName}))
        ]
      }
    }
    if (node.children) node.children.forEach(child => {injectEffectUnsubs(child)})
  }

module.exports = {
    injectEffectUnsubs: injectEffectUnsubs
}