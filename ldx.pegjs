{   
    const fs = require('fs');
    // const logger = require('./logger');

    // === Configuration Loading ===
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    const mappingConfig = JSON.parse(fs.readFileSync('derma-mappings.json', 'utf8'));

    // === Lua Generation Types ===
    const types = {
        func: (varName, method, value) => `${varName}.${method}(${value || ''})\n`,
        classFunc: (varName, method, value) => `${varName}:${method}(${value || ''})\n`,
        property: (varName, method, value) => `${varName}.${method} = ${value.replace(/^\s+|\s+$/g, '')}\n`, // trim spaces at the start & end of value
    };

    // === Mapping Setup ===
    const baseMappings = Object.fromEntries(
        Object.entries(mappingConfig.baseMappings).map(([key, val]) => [
            key,
            { ...val, mapType: types[val.mapType] },
        ])
    );

    const dermaMappings = Object.fromEntries(
        Object.entries(mappingConfig.dermaMappings).map(([tag, propNames]) => [
            tag,
            Object.fromEntries(propNames.map(name => [name, baseMappings[name]])),
        ])
    );

    function getInheritedAttributes(tag, mappings) {
        const result = new Set();
        
        function collectDermaAttributes(currentTag) {
            if (!currentTag || !mappings.inheritance[currentTag]) return;

            if (mappings.dermaMappings[currentTag]) {
                mappings.dermaMappings[currentTag].forEach(attr => result.add(attr));
            }

            const parents = mappings.inheritance[currentTag];
            if (parents) {
                parents.forEach(parent => collectDermaAttributes(parent));
            }
        }
        
        collectDermaAttributes(tag);
        return Array.from(result);
    }

    // === Global State ===
    const identifiedComponents = [];
    let varCounter = 0;

    // === Utility Functions ===
    function replaceParentAlias(value, parentName) {
        let processedValue = value;
        if (!value) return;
        if (parentName && value.includes('$PARENT')) {
            processedValue = value.replace(/\$PARENT/g, parentName || '');
        } 
        else if (value.includes('$PARENT')) {
            processedValue = value.replace(/\$PARENT/g, 'PARENT');
        }
        return processedValue;
    }

    function processType(element, parentName = null) {

        if (element.type === 'if') {
            let lua = `if ${element.condition} then\n`;
            lua += element.children.map(child => processType(child, parentName)).join('');
            lua += 'end\n';
            console.log(lua);
            return lua;
        }

        if (element.type === 'map') {
            let lua;
            const mapTableName = `${config.varPrefix}${varCounter++}`;
            lua = `local ${mapTableName} = {}\n` ;
            lua += `for ${config.indexVar || 'i'}, ${config.itemVar || 'item'} in pairs(${element.iterable}) do\n`;
            lua += element.children
                .map(child => {
                    child.customVarName = `${mapTableName}[$INDEX]`
                    child.notGenerateVariable = true
                    const childCode = processType(child, parentName);
                    return childCode
                        .replace(/\$INDEX/g, config.indexVar || `i`)
                        .replace(/\$ITEM/g, config.itemVar || 'item');
                })
                .join('');
            lua += 'end\n';
            return lua;
        }

        if (element.type === 'inline') {
            const code = replaceParentAlias(element.code, parentName);
            return `${code}\n`;
        }

        if (element.type === 'inject') {
            return `${element.name}(${element.arg}, ${parentName || 'PARENT'})\n`;
        }

        return makeElement(element, parentName);
    }

    function processSubscriptions(element, code, varname) {
        if (element.subscriptions && element.subscriptions.length > 0) {
            code += `${varName}.UpdateProps = function(self)\n`;


        }
    }

    function makeElement(element, parentName = null) {
        let varName = element.props.id && typeof(element.props.id) === 'string' || element.customVarName
            ? element.customVarName || element.props.id.replaceAll('\"', '')
            : `${config.varPrefix}${varCounter++}`;
        identifiedComponents[varName] = element.props;

        let lua;
        element.notGenerateVariable ? 
            lua = `${varName} = vgui.Create("${element.tag}"${parentName ? ', ' + parentName : ', PARENT'})\n`
            :
            lua = `local ${varName} = vgui.Create("${element.tag}"${parentName ? ', ' + parentName : ', PARENT'})\n`;


        const inheritedAttrs = getInheritedAttributes(element.tag, mappingConfig);
        const mappings = Object.fromEntries(
            inheritedAttrs.map(attr => [attr, baseMappings[attr]])
        );

        let propsStr = '';

        if (element.subscriptions && element.subscriptions.length > 0) {
            const subscriptionStr = element.subscriptions.join(', ')
            
            element.subscriptions.forEach(stateName => {
            propsStr += `${varName}.__Update__${stateName} = function(self, ${stateName})\n`;
            
            Object.entries(element.props || {}).forEach(([key, val]) => {
                const mapping = mappings[key];
                if (!mapping) return;
                let processedVal = replaceParentAlias(val, parentName);
                propsStr += mapping.mapType("self", mapping.method, processedVal);
            });
            
            propsStr += `self:InvalidateChildren(true)\n`;
            propsStr += `end\n`;
            
            const updateFunc = `${varName}:__Update__${stateName}`;
            propsStr += `${updateFunc}(${stateName})\n`;
            propsStr += `${stateName}.subscribe(function(state)\n`;
            propsStr += `${updateFunc}(state)\n`
            propsStr += `end)\n`;
        });

        } else {
            Object.entries(element.props || {}).forEach(([key, val]) => {
                const mapping = mappings[key];
                if (!mapping) return;
                let processedVal = replaceParentAlias(val, parentName);
                propsStr += mapping.mapType(varName, mapping.method, processedVal);
            });
        }


        //

        lua += propsStr;

        if (element.children.length) {
            lua += element.children.map(child => {
                if (child.type === "inject") {
                    return `${child.name}(${child.arg}, ${varName})\n`;
                } else if (child.type === "inline") {
                    const code = replaceParentAlias(child.code, varName);
                    return code + "\n";
                }
                return processType(child, varName);
            }).join('');
        }
        return lua;
    }
}

// File start
start
    = WS components:( (componentDef / externalCodeDef) WS )* {
        return components.map(c => c[0].code).join('\n\n');
    }

componentDef
    = externalCode:(externalCode WS)? "Component" WS name:[A-Za-z]+ WS "=" WS "{" WS inlineBefore:inlineCode? WS elements:element* WS inlineAfter:inlineCode? WS "}" {
        const external = externalCode ? externalCode[0] + "\n\n" : "";
        console.log("inlineBefore:", inlineBefore);  // Debug
        const inlineBeforeCode = inlineBefore && inlineBefore.code ? inlineBefore.code + '\n' : '';
        const inlineAfterCode = inlineAfter && inlineAfter.code ? inlineAfter.code + '\n' : '';
        const code = `function ${name.join('')}(LDX_INPUT_ARGS, PARENT)\n` + 
                    inlineBeforeCode +
                    elements.map(elem => processType(elem)).join('') + 
                    inlineAfterCode +
                    "end";
        return { code: external + code };
    }

externalCodeDef
    = code:externalCode {
        return { code: code };
    }

externalCode
    = "{" WS content:nestedCurly WS "}" { return content; }

element 
    = "<" tag:tagName subscriptions:subscription* props:prop* ">" WS children:(WS (element / inject / inlineCode / ifBlock / mapBlock))* WS "</" tagName ">"
    { 
        return { 
            tag: tag,
            subscriptions: subscriptions.map(s => s[1]), 
            props: Object.fromEntries(props), 
            children: children.map(c => c[1]) 
        }; 
    }
    / "<" tag:tagName subscriptions:subscription* props:prop* WS "/>"
    { return { tag: tag, props: Object.fromEntries(props), children: [], subscriptions: subscriptions.map(s => s[1]) }; }
    / inlineCode
    / ifBlock
    / mapBlock

subscription
    = WS "@" name:[a-zA-Z0-9]+ { return ["@", name.join('')]; }

inlineCode
    = "{" WS content:nestedCurly WS "}" { return { type: "inline", code: content }; }

nestedCurly
    = chars:(nestedCurlyContent / nestedCurlyBlock)* { return chars.join(''); }

nestedCurlyContent
    = char:[^{}]+ { return char.join(''); }

nestedCurlyBlock
    = "{" WS inner:nestedCurly WS "}" { return "{" + inner + "}"; }

tagName
    = [A-Za-z]+ { return text(); }

prop 
    = WS name:[a-zA-Z]+ "=" value:value { return [name.join(''), value]; }
    / WS name:[a-zA-Z]+ { return [name.join(''), null]; }

value
    = "\"" val:[^\"]* "\"" { return val.join(''); }
    / "{" val:nestedCurly "}" { return val; }

WS "whitespace" = [ \t\r\n]*

inject
    = "INJECT(" WS name:[A-Za-z]+ WS ")"
    { return { type: "inject", name: name.join(""), arg: "LDX_INPUT_ARGS" }; }

ifBlock
    = "IF(" condition:[^)]+ ")" WS subscriptions:subscription* WS "[" WS elements:(element WS)* WS "]" {
        return { 
            type: "if", 
            condition: condition.join(''), 
            children: elements.map(e => e[0]),
            subscriptions: subscriptions
        };
    }

mapBlock
    = "MAP(" iterable:[^)]+ ")" WS subscriptions:subscription* WS "[" WS elements:(element WS)* WS "]" {
        return { 
            type: "map", 
            iterable: iterable.join(''), 
            children: elements.map(e => e[0]) 
        };
    }