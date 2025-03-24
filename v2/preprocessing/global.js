const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const snippetGenerator = require('../codegen/snippet-generator')
const varCounter = 0

const DEFAULT_CONTEXT = Object.freeze({
  isRoot: false,
  isLocal: true,
  mapScope: {
    inMap: false,
    isReactive: false,
    scopeDepth: 0,
    mapStores: []
  }
})

module.exports = {
VAR_PREFIX: config.varPrefix,
  ITEM_PREFIX: config.itemVar,
  INDEX_PREFIX: config.indexVar,
  PARENT_ALIAS: "$PARENT",
  MAP_ITEM_ALIAS: "$ITEM",
  MAP_INDEX_ALIAS: "$INDEX",
  UNSUBSCRIBE_ARRAY: "__UNSB__",
  UNSUBSCRIBE_AFFIX: "__unsb__",
  UPDATE_METHOD_AFFIX: "__update__",
  MAP_VARIABLE_STORE_AFFIX: "__mvs__",
  METADATA_UPDATE_ALL_PROPS: '!',
  METADATA_INVALIDATE_CHILDREN: '&',
  ITERATION_MAX: 10,
  ITERATION_CURRENT: 0,
  SNIPPETS: snippetGenerator.SNIPPETS,
  varCounter: varCounter,
  INTERNAL_PROPS: ["nolocal", "key", "id"],
  DEFAULT_CONTEXT: DEFAULT_CONTEXT
}