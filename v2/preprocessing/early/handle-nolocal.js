const G = require('../global')
// If element has nolocal prop than it will be global (NOT RECOMMENDED)
function handleNoLocal(node) {
    if (node.type === 'element') {
      node.props.nolocal ? node.context.isLocal = false : node.context.isLocal = true
    }
    if (node.children) node.children.forEach(child => {
      handleNoLocal(child)
    })
  }
  
module.exports = {
    handleNoLocal: handleNoLocal
}