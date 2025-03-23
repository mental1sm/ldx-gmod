const EARLY = require('./_index')
const UTIL = require('../p-util')
const G = require('../global')

const executeEarlyStage = (tree) => {
    console.log('[Preprocessing] Stage: [Early]')

    // Define context on preprocessing
    UTIL.applyHandlerToRoot(tree, EARLY.INIT_CONTEXT)
    UTIL.applyHandlerToNodes(tree, EARLY.INIT_CONTEXT)
    UTIL.applyHandlerToNodes(tree, EARLY.ANALYZE_CONTEXT)
    UTIL.applyHandlerToNodes(tree, UTIL.context.analyzeContext)

    // Handle nolocal directive
    UTIL.applyHandlerToNodes(tree, EARLY.HANDLE_NOLOCAL)
    
    // Define variable names
    UTIL.applyHandlerToNodes(tree, EARLY.DEFINE_VARNAME)

    // Define parents
    tree.forEach(rootNode => {
        if (rootNode.type === 'component') {
            rootNode.elements.forEach(element => {EARLY.DEFINE_PARENT(element, "PARENT")})
        }
        rootNode.parent = "NOPARRENT"
    })

    // Scan tree and marks root element in context
    UTIL.applyHandlerToRoot(tree, EARLY.DEFINE_ROOT)

    console.log('[Preprocessing] Stage: [Early] finished')
    return tree
}

module.exports = {
    executeEarlyStage: executeEarlyStage
}