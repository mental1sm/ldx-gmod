const mappingInheritanceMaster = require('../util/ldx-inheritance')

const SNIPPETS = Object.freeze({
    CREATE_FUNCTION: "CREATE_FUNCTION", // name args
    END_SOMESTING: "END_SOMETHING",
    CREATE_VARIABLE: "CREATE_VARIABLE", // isLocal? name value
    CREATE_EMPTY_TABLE: "CREATE_EMPTY_TABLE", // isLocal? name
    CREATE_UPDATE_FUNCTION: "CREATE_UPDATE_FUNCTION", // name elementName elementTag reactiveDependency reactiveProps
    SUBSCRIBE: "SUBSCRIBE", // name elementName reactiveDependency updateCallbackName
    CREATE_ON_REMOVE_UNSUBSCRIBE_HANDLER: "CREATE_ON_REMOVE_UNSUBSCRIBE_HANDLER", // elementName unsubscribeName customize,
    CALL_CLASS_METHOD: "CALL_CLASS_METHOD", // class name args
    CALL_FUNCTION: "CALL_FUNCTION", // name args
    REDEFINE_PROPERTY: "REDEFINE_PROPERTY", // class property value,
    ADD_ITEM_TO_TABLE: "ADD_ITEM_TO_TABLE", // table key valueб
    USE_EFFECT: "USE_EFFECT" // name body deps
  })

const generateCreateFunction = (args) => {
    return `local ${args.name} = function(${args.args})\n`
}

const generateEndSomething = (args) => {
    return `end\n`
}

const generateCreateVariable = (args) => {
    return args.isLocaL ? `local ${args.name} = ${args.value}\n` : `${args.name} = ${args.value}\n`
}

const generateCreateEmptyTable = (args) => {
    return args.isLocaL ? `local ${args.name} = {}` : `${args.name} = {}\n`
}

const generateCreateUpdateFunction = (args) => {
    console.log(args)
    return `${args.name} = function(${args.reactiveDependency})
        ${mappingInheritanceMaster.generateProps(args.elementName, args.elementTag, args.reactiveProps).join('\n')} 
    end\n`
}

const generateCreateSubscribe = (args) => {
    console.log(args)
    return `${args.name} = ${args.reactiveDependency}.subscribe(function(state)
        ${args.elementName}:${args.updateCallbackName}(state)
    end, true, 
    function() 
        return IsValid(${args.elementName}) 
    end)\n`
}

const generateCReateOnRemoveUnsubHandler = (args) => {
    return `${args.elementName}.OnRemove = function(self)
        ${Object.values(args.children).map(child => generateSnippet(child))}
        for _, _u in pairs(${args.unsubscribeName}) do
            _u()
        end
        ${args.customization}
    end`
}

const generateCallClassMethod = (args) => {
    const joinedArgs = args.args ? args.args.join(', ') : ''
    return `${args.class}:${args.name}(${joinedArgs})\n`
}

const generateCallFunction = (args) => {
    const joinedArgs = args.args ? args.args.join(', ') : ''
    return `${args.name}(${joinedArgs})\n`
}

const generateRedefineProperty = (args) => {
    return `${args.class}.${args.property} = ${args.value}\n`
}

const generateAddItemToTable = (args) => {
    return `${args.table}[${args.key}] = ${args.value}\n`
}

const generateUseEffect = (args) => {
    return `local ${args.name} = useEffect(${args.body}, {${args.deps}})()\n`
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
    USE_EFFECT: generateUseEffect
}

const generateSnippet = (snippet) => {
    const snippetExecutor = snippetMappings[snippet.variant]
    return snippetExecutor ? snippetExecutor(snippet.args) : ''
}


  module.exports.SNIPPETS = SNIPPETS
  module.exports.generateSnippet = generateSnippet