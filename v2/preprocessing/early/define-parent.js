const G = require('../global')
function defineParent(node, parent) {
    node.parent = parent;
    let proxiedParent;
    if (['map', 'if', 'use_effect', 'reactive_map'].includes(node.type)) proxiedParent = parent
    else proxiedParent = node.varName
    if(node.children?.length) node.children.forEach(child => {defineParent(child, proxiedParent)})
}

module.exports = {
    defineParent: defineParent
}