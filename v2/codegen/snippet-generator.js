const mappingInheritanceMaster = require('../util/ldx-inheritance')

const SNIPPETS = Object.freeze({
    CREATE_FUNCTION: "CREATE_FUNCTION", // name args children
    END_SOMESTING: "END_SOMETHING",
    CREATE_VARIABLE: "CREATE_VARIABLE", // isLocal? name value
    CREATE_EMPTY_TABLE: "CREATE_EMPTY_TABLE", // isLocal? name
    CREATE_UPDATE_FUNCTION: "CREATE_UPDATE_FUNCTION", // name elementName elementTag reactiveDependency reactiveProps
    SUBSCRIBE: "SUBSCRIBE", // name elementName reactiveDependency updateCallbackName
    CREATE_ON_REMOVE_UNSUBSCRIBE_HANDLER: "CREATE_ON_REMOVE_UNSUBSCRIBE_HANDLER", // elementName unsubscribeName customize,
    CALL_CLASS_METHOD: "CALL_CLASS_METHOD", // class name args
    CALL_FUNCTION: "CALL_FUNCTION", // name args
    REDEFINE_PROPERTY: "REDEFINE_PROPERTY", // class property value,
    ADD_ITEM_TO_TABLE: "ADD_ITEM_TO_TABLE", // table key value
    USE_EFFECT: "USE_EFFECT", // name body deps
    CREATE_FOR: "CREATE_FOR", // iterable indexName itemName children
    SUBSCRIBE_FN_ONLY: "SUBSCRIBE_FN_ONLY" // name reactiveDependency func args validator
    
  })

const generateCreateFunction = (s) => {
    return `local ${s.args.name} = function(${s.args.args})
        ${s.args.body ? s.args.body : ''}
    end\n`
}

const generateEndSomething = (s) => {
    return `end\n`
}

const generateCreateVariable = (s) => {
    return s.args.isLocal ? `local ${s.args.name} = ${s.args.value}\n` : `${s.args.name} = ${s.args.value}\n`
}

const generateCreateEmptyTable = (s) => {
    return s.args.isLocal ? `local ${s.args.name} = {}\n` : `${s.args.name} = {}\n`
}

const generateCreateUpdateFunction = (s) => {
    console.dir(s, { depth: null });

    return `${s.args.name} = function(${s.args.reactiveDependency})
        ${mappingInheritanceMaster.generateProps(s.args.elementName, s.args.elementTag, s.args.reactiveProps).join('\n')}
        ${s.args.body} 
    end\n`
}

const generateCreateSubscribe = (s) => {
    return `${s.args.name} = ${s.args.reactiveDependency}.subscribe(function(state)
        ${s.args.elementName}:${s.args.updateCallbackName}(state)
    end, true, 
    function() 
        return IsValid(${s.args.elementName}) 
    end)\n`
}

const generateSubscriptionWithFunctionOnly = (s) => {
    return `${s.args.name} = ${s.args.reactiveDependency}.subscribe(function(state)
        ${s.args.func}(${s.args.args.join(', ')})
    end, true,
    function()
        return IsValid(${s.args.validator})
    end)\n`
}

const generateCReateOnRemoveUnsubHandler = (s) => {
    return `${s.args.elementName}.OnRemove = function(self)
        ${Object.values(s.args.children).map(child => generateSnippet(child))}
        for _, _u in pairs(${s.args.unsubscribeName}) do
            _u()
        end
        ${s.args.customization}
    end`
}

const generateCallClassMethod = (s) => {
    const joinedArgs = s.args.args ? s.args.args.join(', ') : ''
    return `${s.args.class}:${s.args.name}(${joinedArgs})\n`
}

const generateCallFunction = (s) => {
    return `${s.args.name}(${s.args.args})\n`
}

const generateRedefineProperty = (s) => {
    return `${s.args.class}.${s.args.property} = ${s.args.value}\n`
}

const generateAddItemToTable = (s) => {
    return `${s.args.table}[${s.args.key}] = ${s.args.value}\n`
}

const generateAddItemCopyToTable = (s) => {
    return `${s.args.table}[${s.args.key}] = table.deep_copy(${s.args.value})\n`
}

const generateUseEffect = (s) => {
    return `local ${s.args.name} = useEffect(${s.args.body}, {${s.args.deps}})()\n`
}

const generateFor = (s) => {
    return `for ${s.args.indexName}, ${s.args.itemName} in pairs(${s.args.iterable}) do
        ${s.args.body}
    end\n`
}


const snippetMappings = {
    CREATE_FUNCTION: generateCreateFunction,
    END_SOMESTING: generateEndSomething,
    CREATE_VARIABLE: generateCreateVariable,
    CREATE_EMPTY_TABLE: generateCreateEmptyTable,
    CREATE_UPDATE_FUNCTION: generateCreateUpdateFunction,
    SUBSCRIBE: generateCreateSubscribe,
    CREATE_ON_REMOVE_UNSUBSCRIBE_HANDLER: generateCReateOnRemoveUnsubHandler,
    CALL_CLASS_METHOD: generateCallClassMethod,
    CALL_FUNCTION: generateCallFunction,
    REDEFINE_PROPERTY: generateRedefineProperty,
    ADD_ITEM_TO_TABLE: generateAddItemToTable,
    USE_EFFECT: generateUseEffect,
    CREATE_FOR: generateFor,
    SUBSCRIBE_FN_ONLY: generateSubscriptionWithFunctionOnly
}

const generateSnippet = (snippet) => {
    const snippetExecutor = snippetMappings[snippet.variant]
    return snippetExecutor ? snippetExecutor(snippet) : ''
}


  module.exports.SNIPPETS = SNIPPETS
  module.exports.generateSnippet = generateSnippet