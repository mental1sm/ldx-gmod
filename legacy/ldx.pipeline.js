const fs = require('fs');
const logger = require('../v2/util/logger')
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const mappingConfig = JSON.parse(fs.readFileSync('derma-mappings.json', 'utf8'));

const ldxAliaser = require('../v2/postprocessing/ldx-aliaser')
const ldxInheritance = require('../v2/util/ldx-inheritance')

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

function processUseEffect(element, parentName = null) {
    let lua = ''
    if (element && element.type === 'use_effect') {
        const varName = `_eff${varCounter++}`
        lua += `local ${varName} = useEffect(${element.body}, {${element.dependencies}})\n\n`
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
    
    // Processing common props (without any reactive vars) as usual
    propsStr += spawnAllNotReactiveProps(element, parentName, mappings, varName);


    element.subscriptions.forEach(sub => {
        // Custom onUpdate
        if (sub.onUpdate) {
            const clearedStateName = sub.name.replace('!', '');
            const updateProperty = `${varName}.__Update__${clearedStateName}`;
            const updateFunc = `${varName}:__Update__${clearedStateName}`;
            propsStr += spawnAllReactiveProps(element, parentName, mappings, varName)
            propsStr += `${updateProperty} = ${sub.onUpdate.code}\n`;
            propsStr += `${updateFunc}(${clearedStateName})\n`;
            if (element.props.key) propsStr += `${config.variables.UNSUBSCRIBE}["__unsb__${varName}${varCounter++}" .. ${element.props.key}] = ${clearedStateName}.subscribe(function(state)\n`;
            else propsStr += `${config.variables.UNSUBSCRIBE}["__unsb__${varName}${varCounter++}"] = ${clearedStateName}.subscribe(function(state)\n`;
            propsStr += `${updateFunc}(state)\n`
            propsStr += `end)\n`;
            return propsStr;
        } 
        // Update children or not
        let update = sub.name.match('&') ? true : false;
        if (sub.name.match('!')) {
            propsStr += processStandartReactive(element, varName, mappings, sub.name.replace('&', ''), sub.onUpdate, parentName, update)
        }
        else {
            propsStr += processRevertReactive(element, varName, mappings, sub.name.replace('&', ''), sub.onUpdate, parentName, update)
        }
    })

    propsStr = propsStr.replaceAll('@', '');
    return propsStr;
}

/**
 * Template @reactive change only deps-based props
 */
function processRevertReactive(element, varName, mappings, stateName, customUpdate = null, parentName = null, update = true) {
    let propsStr = '';
    const clearedStateName = stateName.replace('!', '');

    const reactiveDeps = {}
    
    let counter = 0;
    // processing props with reactive var
    Object.entries(element.props || {}).forEach(([key, val]) => {
        const mapping = mappings[key];
        if (!mapping) return;
        let processedVal = ldxAliaser.replaceParentAlias(val, parentName);
        // Need to find all methods with reactive deps
        if (processedVal && processedVal.match(`@${stateName}`)) {
            const reactiveDep = processedVal.replace('@', '');
            const reactiveRootDep = reactiveDep.match('.') ? reactiveDep.split('.')[0] : reactiveDep
            if (!reactiveDeps[reactiveRootDep]) {
                reactiveDeps[reactiveRootDep] = []
            }
            reactiveDeps[reactiveRootDep].push(mapping.mapType("self", mapping.method, reactiveDep))
        }
    });

    Object.entries(reactiveDeps).forEach(([key, val]) => {
        const updateProperty = `${varName}.__Update__${clearedStateName}${counter}`;
        const updateFunc = `${varName}:__Update__${clearedStateName}${counter}`;
        propsStr += `${updateProperty} = function(self, ${clearedStateName})\n`;
        val.map(val => {
            propsStr += val
        })
        if (update) propsStr += `self:InvalidateChildren(true)\n`;
        propsStr += `end\n`;
        if (element.props.key) propsStr += `${config.variables.UNSUBSCRIBE}["__unsb__${varName}${varCounter++}" .. ${element.props.key}] = ${clearedStateName}.subscribe(function(state)\n`;
        else propsStr += `${config.variables.UNSUBSCRIBE}["__unsb__${varName}${varCounter++}"] = ${clearedStateName}.subscribe(function(state)\n`;
        propsStr += `${updateFunc}(state)\n`
        propsStr += `end)\n`;
        propsStr += `${updateFunc}(${clearedStateName})\n`;
        counter++;
    })

    return propsStr;
}

/**
 * Template @reactive! change all reactive and non-reactive props on update
 */
function processStandartReactive(element, varName, mappings, stateName, customUpdate = null, parentName = null, update = true) {
    const clearedStateName = stateName.replace('!', '');
    let propsStr = '';

    propsStr = `${varName}.__Update__${clearedStateName} = function(self, ${clearedStateName})\n`;
    propsStr += spawnAllProps(element, parentName, mappings)
    
    if (update) propsStr += `self:InvalidateChildren(true)\n`;
    propsStr += `end\n`;
    
    const updateFunc = `${varName}:__Update__${clearedStateName}`;
    propsStr += `${updateFunc}(${clearedStateName})\n`;
    if (element.props.key) propsStr += `${config.variables.UNSUBSCRIBE}["__unsb__${varName}${varCounter++}" .. ${element.props.key}] = ${clearedStateName}.subscribe(function(state)\n`;
    else propsStr += `${config.variables.UNSUBSCRIBE}["__unsb__${varName}${varCounter++}"] = ${clearedStateName}.subscribe(function(state)\n`;
    propsStr += `${updateFunc}(state)\n`
    propsStr += `end)\n`;
    
    return propsStr
}

function spawnAllProps(element, parentName, mappings) {
    let propsStr = '';
    Object.entries(element.props || {}).forEach(([key, val]) => {
        const mapping = mappings[key];
        if (!mapping) return;
        let processedVal = ldxAliaser.replaceParentAlias(val, parentName);
        propsStr += mapping.mapType("self", mapping.method, processedVal);
    });
    return propsStr;
}

function spawnAllNotReactiveProps(element, parentName, mappings, varName) {
    let propsStr = '';
    Object.entries(element.props || {}).forEach(([key, val]) => {
        const mapping = mappings[key];
        if (!mapping) return;
        let processedVal = ldxAliaser.replaceParentAlias(val, parentName);
        if (!processedVal) processedVal = ''
        if (!processedVal.match("@[a-zA-Z_]+")) {
            propsStr += mapping.mapType(varName, mapping.method, processedVal);
        }
    });
    return propsStr;
}

function spawnAllReactiveProps(element, parentName, mappings, varName) {
    let propsStr = '';
    Object.entries(element.props || {}).forEach(([key, val]) => {
        const mapping = mappings[key];
        if (!mapping) return;
        let processedVal = ldxAliaser.replaceParentAlias(val, parentName);
        if (!processedVal) processedVal = ''
        if (processedVal.match("@[a-zA-Z_]+")) {
            propsStr += mapping.mapType(varName, mapping.method, processedVal);
        }
    });
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

            result = processUseEffect(element, parentName);
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

function extractVariableName(str) {
    const match = str.match(/^\s*local\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/);
    return match ? match[1] : null;
}

function findSideEffects(code) {
    const result = []
    const strings = code.split('\n')
    strings.map(str => {
        if (str.match('useEffect')) {
            const varName = extractVariableName(str)
            if (varName) result.push(varName);
        }
    })
    return result;
}

function findUnsubscribes(code) {
    const result = []
    const strings = code.split('\n')
    strings.map(str => {
        if (str.match('__unsb__')) {
            const varName = extractVariableName(str)
            if (varName) result.push(varName);
        }
    })
    return result;
}

function processSideEffect(sideEffect) {
    return `local _clnp_${sideEffect} = ${sideEffect}()\n`
}

function generateUnmountHandle(code) {
    let lua = ''
    const strings = code.split('\n')
    const rootElement = strings.find(str => str.match("vgui."))
    if (!rootElement) return lua
    const varName = extractVariableName(rootElement)
    if (!varName) return lua

    const effects = findSideEffects(code)
    
    effects.map(effect => {
        lua += processSideEffect(effect)
    })

    lua += `${varName}.OnRemove = function(self)\n`
    lua += `for _, _u in pairs(${config.variables.UNSUBSCRIBE}) do\n\t_u()\nend\n`
    effects.map(effect => {
        lua += ` _clnp_${effect}()\n`
    })
    lua += 'end\n'
    return lua;
}

module.exports.typePipeline = typePipeline
module.exports.generateUnmountHandle = generateUnmountHandle