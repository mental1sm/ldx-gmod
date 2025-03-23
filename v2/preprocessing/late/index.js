const LATE = require('./_index')
const UTIL = require('../p-util')
const G = require('../global')

const executeLateStage = (tree) => {
    console.log('[Preprocessing] Stage: [Late]')

    //console.dir(tree, { depth: null });
   
    // Reactive map integration
    UTIL.applyHandlerToNodes(tree, LATE.REACTIVE_MAP_MODULE.buildReactiveMaps)
    UTIL.applyHandlerToNodes(tree, LATE.REACTIVE_MAP_MODULE.manageReactiveMapVariables)
    UTIL.applyHandlerToNodes(tree, LATE.REACTIVE_MAP_MODULE.replaceReactiveMapAliasesInProps)
    UTIL.applyHandlerToNodes(tree, LATE.REACTIVE_MAP_MODULE.generateUpdateFunctionForReactiveMaps)

    // Generates useEffect snippets at the end of component and call it
    UTIL.applyHandlerToNodes(tree, LATE.USE_EFFECT)

    // Generates snippets to handle unsubscription
    UTIL.applyHandlerDirectly(tree, LATE.HANDLE_UNSUBSCRIPTION)

    // Injects useEffect cleanup callbacks to root:OnRemove
    UTIL.applyHandlerToNodes(tree, LATE.INJECT_USE_EFFECT_UNSUBS)

    // Create subscriptions for reactive variables
    UTIL.applyHandlerToNodes(tree, LATE.CREATE_SUBSCRIPTION)

    UTIL.applyHandlerToNodes(tree, UTIL.context.analyzeContext)

    //console.dir(tree, { depth: null });

    // Replace aliases
    UTIL.applyHandlerToNodes(tree, LATE.REPLACE_PARENT_ALIAS)
    UTIL.applyHandlerToNodes(tree, LATE.REPLACE_MAP_ALIAS)

    console.log('[Preprocessing] Stage: [Late] finished')
    return tree
}

module.exports = {
    executeLateStage: executeLateStage
}