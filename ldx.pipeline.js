const fs = require('fs');
const logger = require('./util/logger')
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const mappingConfig = JSON.parse(fs.readFileSync('derma-mappings.json', 'utf8'));

const ldxAliaser = require('./util/ldx-aliaser')
const ldxInheritance = require('./util/ldx-inheritance')

// === Global State ===
const identifiedComponents = [];
let varCounter = 0;

function processIf(element, parentName = null) {
    let lua = ''
    if (element && element.type === 'if') {
        lua += `if ${element.condition} then\n`;
        lua += element.children.map(child => typePipeline(child, parentName).processAll()).join('');
        lua += 'end\n';
        return lua
    }
}

function processMap(element, parentName = null) {
    let lua = ''
    if (element && element.type === 'map') {
        const mapTableName = `${config.varPrefix}${varCounter++}`;
        lua += `local ${mapTableName} = {}\n` ;
        lua += `for ${config.indexVar || 'i'}, ${config.itemVar || 'item'} in ipairs(${element.iterable}) do\n`;
        element.children
            .map(child => {
                child.customVarName = `${mapTableName}[$INDEX]`
                child.notGenerateVariable = true
                const childCode = typePipeline(child, parentName).processAll()
                lua += childCode
                    .replace(/\$INDEX/g, config.indexVar || `i`)
                    .replace(/\$ITEM/g, config.itemVar || 'item');
            })
            .join('');
        lua += 'end\n';
        return lua
    }
}

function processInlineCode(element, parentName = null) {
    let lua = ''
    if (element && element.type === 'inline') {
        const code = ldxAliaser.replaceParentAlias(element.code, parentName);
        lua += `${code}\n`;
        return lua
    }
}

function processElement(element, parentName = null) {
    let lua = ''
    let varName = (element.props.id && typeof(element.props.id) === 'string') || element.customVarName
        ? element.customVarName || element.props.id.replaceAll('\"', '')
        : `${config.varPrefix}${varCounter++}`;
    identifiedComponents[varName] = element.props;

    // If flag notGeneratedVariable then definition of variable was before; skip definition
    element.notGenerateVariable ? 
        lua += `${varName} = vgui.Create("${element.tag}"${parentName ? ', ' + parentName : ', PARENT'})\n`
        :
        lua += `local ${varName} = vgui.Create("${element.tag}"${parentName ? ', ' + parentName : ', PARENT'})\n`;


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
    lua += childrenCode;
    return lua
}

function processCommonElementProps(element, varName, mappings, parentName = null) {
    let propsStr = '';
    Object.entries(element.props || {}).forEach(([key, val]) => {
        const mapping = mappings[key];
        if (!mapping) return;
        let processedVal = ldxAliaser.replaceParentAlias(val, parentName);
        if (!processedVal) processedVal = ''
        propsStr += mapping.mapType(varName, mapping.method, processedVal);
    });
    return propsStr;
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

    return propsStr;
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
            return typePipeline(child, varName).processAll();
        }).join('');
    }
    return lua;
}

function typePipeline(element, parentName = null) {
    return {
        processAll: () => {
            let result = processIf(element, parentName);
            if (result) return result;

            result = processMap(element, parentName);
            if (result) return result;

            result = processInlineCode(element, parentName);
            if (result) return result;

            result = processElement(element, parentName);
            if (result) return result;

            logger.warn('No processing matched! Returning empty string.');
            return '';
        }
    }
}

module.exports.typePipeline = typePipeline