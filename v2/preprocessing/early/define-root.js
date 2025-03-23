const G = require('../global')
// If element has component argument as parent then it will be the root element
function defineRootElement(component) {
    if (component.type !== 'component') return
    const rootElement = component.elements.find(element => element.type === 'element' && element.parent === 'PARENT')
    if (rootElement) rootElement.context.isRoot = true
  }

module.exports = {
    defineRootElement: defineRootElement
}