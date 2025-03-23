const CREATE_SUBSCRIPTION = require('./create-subscriptions')
const HANDLE_UNSUBSCRIPTION = require('./handle-unsubscription')
const INJECT_USE_EFFECT_UNSUBS = require('./inject-use-effect-unsub')
const REACTIVE_MAP = require('./reactive-map')
const REPLACE_MAP_ALIAS = require('./replace-map-alias')
const REPLACE_PARENT_ALIAS = require('./replace-parent-alias')
const USE_EFFECT = require('./use-effect')

module.exports = {
    CREATE_SUBSCRIPTION: CREATE_SUBSCRIPTION.createSubscriptions,
    HANDLE_UNSUBSCRIPTION: HANDLE_UNSUBSCRIPTION.handleUnsubscription,
    INJECT_USE_EFFECT_UNSUBS: INJECT_USE_EFFECT_UNSUBS.injectEffectUnsubs,
    REACTIVE_MAP_MODULE: REACTIVE_MAP,
    REPLACE_MAP_ALIAS: REPLACE_MAP_ALIAS.replaceMapAliases,
    REPLACE_PARENT_ALIAS: REPLACE_PARENT_ALIAS.replaceParentAlias,
    USE_EFFECT: USE_EFFECT.handleUseEffects
}