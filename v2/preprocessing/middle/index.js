const MIDDLE = require('./_index')
const UTIL = require('../p-util')

const executeMiddleStage = (tree) => {
    console.log('[Preprocessing] Stage: [Middle]')

    // Group props by reactive & common
    UTIL.applyHandlerToNodes(tree, MIDDLE.GROUP_PROPS)

    UTIL.applyHandlerToNodes(tree, UTIL.context.analyzeContext)

    // Create table to store iterable elements inside of map
    UTIL.applyHandlerToNodes(tree, MIDDLE.MANAGE_MAP_VARS)
    
    console.log('[Preprocessing] Stage: [Middle] finished')
    return tree
}

module.exports = {
    executeMiddleStage: executeMiddleStage
}