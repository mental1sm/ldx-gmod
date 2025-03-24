const G = require('../global')
const UTIL = require('../p-util')
// Finds all useEffects and transform them into snippets which will be pushed at the end of root
function handleUseEffects(node) {
    if (node.type === 'use_effect') {
      const useEffectSnippet = UTIL.makeSnippet(G.SNIPPETS.USE_EFFECT, {name: node.varName, body: node.body, deps: node.dependencies})
      useEffectSnippet.context = {...G.DEFAULT_CONTEXT}
      node.context.pushNodeToParentChildrenSectionEnd(useEffectSnippet)
    }
    if (node.children) node.children.forEach(child => {handleUseEffects(child)})
  }

module.exports = {
  handleUseEffects: handleUseEffects
}