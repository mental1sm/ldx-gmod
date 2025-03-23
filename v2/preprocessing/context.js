const G = require('./global')
// Analyze context on different states
function analyzeContext(node) {
    if (node.type === 'reactive_map') {
        node.context.mapScope.scopeDepth++
        node.context.mapScope.inMap = true
      if (node.children && node.children.length) {
        node.children.forEach(child => {
          child.context = {...child.context, mapScope: {...child.context.mapScope, isReactive: true, inMap: true, scopeDepth: node.context.mapScope.scopeDepth}}
          analyzeContext(child)
        })
      }
    }
    if (node.type === 'map') {
        node.context.mapScope.scopeDepth++
        node.context.mapScope.inMap = true
      if (node.children && node.children.length) {
        node.children.forEach(child => {
          child.context = {...child.context, mapScope: {...child.context.mapScope, isReactive: false, inMap: true, scopeDepth: node.context.mapScope.scopeDepth}}
          analyzeContext(child)
        })
      }
    }
    if (node.type === 'element' && node.children && node.children.length) {
      node.children.forEach(child => {
        child.context = {...child.context, mapScope: node.mapScope || {inMap: false, scopeDepth: 0, mapStores: []}}
        analyzeContext(child)
      })
    } 
  }

module.exports = {
    analyzeContext: analyzeContext
}