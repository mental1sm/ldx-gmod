const G = require('../global')
/**
 * Groups props by their type
 * Common - initialized at mount
 * Reactive - initialized at mound and activate subscribe
 * Iternal - not initialized and used for preprocessing & codegen
 */
function groupProps(node) {
    if (node.type === 'element') {
        node.commonProps = {}
        node.reactiveProps = {}
        node.internalProps = {}
        Object.entries(node.props).forEach(([propName, propContent]) => {
            if (G.INTERNAL_PROPS.includes(propName)) {
              node.internalProps[propName] = propContent
            }
            else if (propContent && propContent.value && propContent.value.match('@')) {
                // Need to find reactive variables
                const reactiveDependencies = propContent.value.match(/@[a-zA-Z0-9._$]+\b/g)
                // Save found deps into reactive props, clear them from reactive directive and prepare array for root deps
                node.reactiveProps[propName] = {...propContent, value: propContent.value.replaceAll('@', ''), dependencies: []}
                // Then we need to calculate which state this prop depends on
                reactiveDependencies.map(dep => {
                    const rootDependency = dep.match('.') ? dep.split('.')[0] : dep
                    node.reactiveProps[propName].dependencies.push(rootDependency.replace('@', ''))
                })
            }
            else {
                node.commonProps[propName] = {...propContent}
            }
            delete node.props
        })
        if (node.children.length) node.children.forEach(child => {groupProps(child)})
    }

    // Skip map and if; then process their children
    // For reactive variables in this directives will be included REACTIVE_MAP and REACTIVE_IF directives
    if (['map', 'if', 'reactive_map', 'snippet', 'plugin'].includes(node.type)) {
        if (node.children.length) node.children.forEach(child => {groupProps(child)})
    }
}

module.exports = {
    groupProps: groupProps
}