const mappingInheritanceMaster = require('../util/ldx-inheritance')

const SNIPPETS = Object.freeze({
    CREATE_FUNCTION: "CREATE_FUNCTION", // name args
    END_SOMESTING: "END_SOMETHING",
    CREATE_VARIABLE: "CREATE_VARIABLE", // isLocal? name value
    CREATE_EMPTY_TABLE: "CREATE_EMPTY_TABLE", // isLocal? name
    CREATE_UPDATE_FUNCTION: "CREATE_UPDATE_FUNCTION", // name elementName elementTag reactiveDependency reactiveProps
    SUBSCRIBE: "SUBSCRIBE", // name elementName reactiveDependency updateCallbackName
    REDEFINE_ON_REMOVE: "REDEFINE_ON_REMOVE", // componentName body
    CALL_CLASS_METHOD: "CALL_CLASS_METHOD", // class name args
    CALL_FUNCTION: "CALL_FUNCTION", // name args
    REDEFINE_PROPERTY: "REDEFINE_PROPERTY", // class property value,
    ADD_ITEM_TO_TABLE: "ADD_ITEM_TO_TABLE" // table key value
  })

const generateCreateFunction = (snippetArgs) => {
    return `local ${snippetArgs.name} = function(${snippetArgs.args})\n`
}

const generateEndSomething = (snippetArgs) => {
    return `end\n`
}

const generateCreateVariable = (snippetArgs) => {
    return snippetArgs.isLocaL ? `local ${snippetArgs.name} = ${snippetArgs.value}\n` : `${snippetArgs.name} = ${snippetArgs.value}\n`
}

const generateCreateEmptyTable = (snippetArgs) => {
    return snippetArgs.isLocaL ? `local ${snippetArgs.name} = {}` : `${snippetArgs.name} = {}\n`
}

const generateCreateUpdateFunction = (snippetArgs) => {
    return `
    ${snippetArgs.name} = function(self, ${reactiveDependency})
        ${mappingInheritanceMaster.generateProps(snippetArgs.elementName, snippetArgs.elementTag, snippetArgs.reactiveProps).join('')} 
    end\n
    `
}

const generateCreateSubscribe = (snippetArgs) => {
    return `
    ${snippetArgs.name} = function(self, ${snippetArgs.reactiveDependency})
        ${snippetArgs.elementName}:${snippetArgs.updateCallbackName}(${snippetArgs.reactiveDependency})
    end\n
    `
}

const generateRedefineOnRemove = (snippetArgs) => {
    return `
    ${snippetArgs.elementName}.OnRemove = function(self)
        ${snippetArgs.body}
    end\n
    `
}

const snippetMappings = {
    CREATE_FUNCTION: generateCreateFunction,
    END_SOMESTING: generateEndSomething,
    CREATE_VARIABLE: generateCreateVariable,
    CREATE_EMPTY_TABLE: generateCreateEmptyTable,
    CREATE_UPDATE_FUNCTION: generateCreateUpdateFunction,
    SUBSCRIBE: generateCreateSubscribe,
    REDEFINE_ON_REMOVE: generateRedefineOnRemove,
    CALL_CLASS_METHOD: () => '',
    CALL_FUNCTION: () => '',
    REDEFINE_PROPERTY: () => '',
    ADD_ITEM_TO_TABLE: () => '' 
}

const generateSnippet = (snippet) => {
    const snippetExecutor = snippetMappings[snippet.variant]
    return snippetExecutor ? snippetExecutor(snippet.args) : ''
}


  module.exports.SNIPPETS = SNIPPETS
  module.exports.generateSnippet = generateSnippet