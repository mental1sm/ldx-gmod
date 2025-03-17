const fs = require('fs');
const logger = require('./util/logger')
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const mappingConfig = JSON.parse(fs.readFileSync('derma-mappings.json', 'utf8'));

const ldxAliaser = require('./util/ldx-aliaser')
const ldxInheritance = require('./util/ldx-inheritance')

// === Lua Generation Types ===
const types = {
    func: (varName, method, value) => `${varName}.${method}(${value || ''})\n`,
    classFunc: (varName, method, value) => `${varName}:${method}(${value || ''})\n`,
    property: (varName, method, value) => `${varName}.${method} = ${value.replace(/^\s+|\s+$/g, '')}\n`, // trim spaces at the start & end of value
};

// === Global State ===
const identifiedComponents = [];
let varCounter = 0;

function processIf(element, parentName = null) {
    if (element.type === 'if') {
        let lua = `if ${element.condition} then\n`;
        lua += element.children.map(child => typePipeline.processAll(child, parentName)).join('');
        lua += 'end\n';
        console.log(lua);
        return lua;
    }
    return ''
}

function processMap(element, parentName = null) {
    if (element.type === 'map') {
        let lua = '';
        const mapTableName = `${config.varPrefix}${varCounter++}`;
        lua = `local ${mapTableName} = {}\n` ;
        lua += `for ${config.indexVar || 'i'}, ${config.itemVar || 'item'} in pairs(${element.iterable}) do\n`;
        lua += element.children
            .map(child => {
                child.customVarName = `${mapTableName}[$INDEX]`
                child.notGenerateVariable = true
                const childCode = typePipeline.processAll(child, parentName)
                return childCode
                    .replace(/\$INDEX/g, config.indexVar || `i`)
                    .replace(/\$ITEM/g, config.itemVar || 'item');
            })
            .join('');
        lua += 'end\n';
        return lua;
    }
    return ''
}

function processInlineCode(element, parentName = null) {
    if (element.type === 'inline') {
        const code = ldxAliaser.replaceParentAlias(element.code, parentName);
        return `${code}\n`;
    }
    return ''
}

function processElement(element, parentName = null) {
    // Generating variable name
    let varName = element.props.id && typeof(element.props.id) === 'string' || element.customVarName
        ? element.customVarName || element.props.id.replaceAll('\"', '')
        : `${config.varPrefix}${varCounter++}`;
    identifiedComponents[varName] = element.props;

    let lua;

    // If flag notGeneratedVariable then definition of variable was before; skip definition
    element.notGenerateVariable ? 
        lua = `${varName} = vgui.Create("${element.tag}"${parentName ? ', ' + parentName : ', PARENT'})\n`
        :
        lua = `local ${varName} = vgui.Create("${element.tag}"${parentName ? ', ' + parentName : ', PARENT'})\n`;


    // Calculating actual mappings of element
    const inheritedAttrs = ldxInheritance.getInheritedAttributes(element.tag, mappingConfig);
    const mappings = Object.fromEntries(
        inheritedAttrs.map(attr => [attr, ldxInheritance.baseMappings[attr]])
    );

    // Props processing
    if (element.subscriptions && element.subscriptions.length > 0) {
        lua += processReactiveElementProps(element, varName, mappings, parentName);
    } else {
        lua += processCommonElementProps(element, varName, mappings, parentName);
    }
    
    // Children processing
    const childrenCode = processElementChildren(element.children, varName)
    return lua + childrenCode
}

function processCommonElementProps(element, varName, mappings, parentName = null) {
    let propStr = '';
    Object.entries(element.props || {}).forEach(([key, val]) => {
        const mapping = mappings[key];
        if (!mapping) return;
        let processedVal = ldxAliaser.replaceParentAlias(val, parentName);
        propStr += mapping.mapType(varName, mapping.method, processedVal);
    });
    return propStr;
}

function processReactiveElementProps(element, varName, mappings, parentName = null) {
    let propsStr = '';
        
    element.subscriptions.forEach(stateName => {
        propsStr += `${varName}.__Update__${stateName} = function(self, ${stateName})\n`;
        
        Object.entries(element.props || {}).forEach(([key, val]) => {
            const mapping = mappings[key];
            if (!mapping) return;
            let processedVal = ldxAliaser.replaceParentAlias(val, parentName);
            propsStr += mapping.mapType("self", mapping.method, processedVal);
        });
        
        propsStr += `self:InvalidateChildren(true)\n`;
        propsStr += `end\n`;
        
        const updateFunc = `${varName}:__Update__${stateName}`;
        propsStr += `${updateFunc}(${stateName})\n`;
        propsStr += `${stateName}.subscribe(function(state)\n`;
        propsStr += `${updateFunc}(state)\n`
        propsStr += `end)\n`;
    })

    return propStr
}

function processElementChildren(children, varName) {
    let lua = '';
    if (children.length) {
        lua += children.map(child => {
            if (child.type === "inject") {
                return `${child.name}(${child.arg}, ${varName})\n`;
            } else if (child.type === "inline") {
                const code = ldxAliaser.replaceParentAlias(child.code, varName);
                return code + "\n";
            }
            return typePipeline.processAll(child, varName);
        }).join('');
    }
    return lua;
}

function typePipeline(element, parentName = null) {
    let result = element;

    return {
        processAll: () => {
            result = processIf(result, parentName);
            if (result) return result;

            result = processMap(result, parentName);
            if (result) return result;

            result = processInlineCode(result, parentName);
            if (result) return result;

            result = processElement(result, parentName);
            if (result) return result;

            logger.warn("No processing matched! Returning empty string.");
            return '';
        }
    }
}

module.exports.typePipeline = typePipeline