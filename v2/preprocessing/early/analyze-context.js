const G = require('../global')
// Analyze context on different states
/**
 * @deprecated
 */
function analyzeContext(node) {
    if (node.type === 'map') {
      if (node.children && node.children.length) {
        node.children.forEach(child => {
          child.context = {...child.context}
          analyzeContext(child)
        })
      }
    }
    if (node.type === 'element' && node.children && node.children.length) {
      node.children.forEach(child => {
        child.context = {...child.context}
        analyzeContext(child)
      })
    } 
  }

module.exports = {
    analyzeContext: analyzeContext
}