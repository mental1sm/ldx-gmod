{   
    const fs = require('fs');
    //const logger = require('./logger')

    // Loads config
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'))
    // Loads mapping config
    const mappingConfig = JSON.parse(fs.readFileSync('derma-mappings.json', 'utf8'))


    const types = {
        func: (vrn, method, val) => `${vrn}.${method}(${val})\n`,
        classFunc: (vrn, method, val) => `${vrn}:${method}(${val})\n`,
        property: (vrn, method, val) => `${vrn}.${method} = (${val})\n`
    };


    const baseMappings = Object.fromEntries(
        Object.entries(mappingConfig.baseMappings).map(([key, val]) => [
        key,
        { ...val, mapType: types[val.mapType] }
        ])
    );

    const dermaMappings = Object.fromEntries(
        Object.entries(mappingConfig.dermaMappings).map(([tag, propNames]) => [
        tag,
        Object.fromEntries(propNames.map(name => [name, baseMappings[name]]))
        ])
    );

    const identifiedComponents = []

    function replaceParrentAlias(value, parentName) {
        let processedVal = value;
        if (parentName && typeof value === 'string' && value.includes('$PARENT')) {
            processedVal = value.replace(/\$PARENT/g, parentName ? parentName : '');
        }
        else if (value.includes('$PARENT')) processedVal = value.replace(/\$PARENT/g, 'PARENT');
        return processedVal
    }

    function processType(element, parentName = null) {
        console.log(element);
        if (element.type === "if") {
            let lua = `if ${element.condition} then\n`;
            lua += element.children.map(child => processType(child, parentName)).join('');
            lua += "end\n";
            console.log(lua);
            return lua;
        } else if (element.type === "map") {
            let lua = `for ${config.indexVar || 'i'}, ${config.itemVar || 'item'} in pairs(${element.iterable}) do\n`;
            lua += element.children.map(child => {
                let childCode = processType(child, parentName);
                return childCode
                    .replace(/\$INDEX/g, config.indexVar || 'i')
                    .replace(/\$ITEM/g, config.itemVar || 'item');
            }).join('');
            lua += "end\n";
            return lua;
        } else if (element.type === "inline") {
            const code = replaceParrentAlias(element.code, parentName);
            return code + "\n";
        } else if (element.type === "inject") {
            return `${element.name}(${element.arg}, ${parentName || 'PARENT'})\n`;
        }

        return makeElement(element, parentName);
    }

    let varCounter = 0;
    function makeElement(element, parentName = null) {
        let varName = element.props.id && typeof(element.props.id) === 'string'
            ? element.props.id.replaceAll('\"', '')
            : `${config.varPrefix}${varCounter++}`;
        identifiedComponents[varName] = element.props;

        let lua = `local ${varName} = vgui.Create("${element.tag}"${parentName ? ', ' + parentName : ', PARENT'})\n`;
        const mappings = dermaMappings[element.tag] || {};
        let propsStr = '';

        Object.entries(element.props || {}).forEach(([key, val]) => {
            const mapping = mappings[key];
            if (!mapping) return;
            let processedVal = replaceParrentAlias(val, parentName);
            propsStr += mapping.mapType(varName, mapping.method, processedVal);
        });

        lua += propsStr;

        if (element.children.length) {
            lua += element.children.map(child => {
                if (child.type === "inject") {
                    return `${child.name}(${child.arg}, ${varName})\n`;
                } else if (child.type === "inline") {
                    const code = replaceParrentAlias(child.code, varName);
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
    = externalCode:(externalCode WS)? "Component" WS name:[A-Za-z]+ WS "=" WS "{" WS elements:element* WS "}" {
        const external = externalCode ? externalCode[0] + "\n\n" : "";
        const code = `function ${name.join('')}(LDX_INPUT_ARGS, PARENT)\n` + 
                    elements.map(elem => processType(elem)).join('') + 
                    "end";
        return { code: external + code };
    }

externalCodeDef
    = code:externalCode {
        return { code: code };
    }

externalCode
    = "{" val:[^}]* "}" { return val.join(''); }

element 
    = "<" tag:tagName props:prop* ">" WS children:(WS (element / inject / inlineCode / ifBlock / mapBlock))* WS "</" tagName ">"
    { 
        return { 
            tag: tag, 
            props: Object.fromEntries(props), 
            children: children.map(c => c[1]) 
        }; 
    }
    / "<" tag:tagName props:prop* WS "/>"
    { return { tag: tag, props: Object.fromEntries(props), children: [] }; }
    / inlineCode
    / ifBlock
    / mapBlock

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

value
    = "\"" val:[^\"]* "\"" { return val.join(''); }
    / "{" val:nestedCurly "}" { return val; }

WS "whitespace" = [ \t\r\n]*

inject
    = "INJECT(" WS name:[A-Za-z]+ WS ")"
    { return { type: "inject", name: name.join(""), arg: "LDX_INPUT_ARGS" }; }

ifBlock
    = "IF(" condition:[^)]+ ")" WS "[" WS elements:(element WS)* WS "]" {
        return { 
            type: "if", 
            condition: condition.join(''), 
            children: elements.map(e => e[0]) 
        };
    }

mapBlock
    = "MAP(" iterable:[^)]+ ")" WS "[" WS elements:(element WS)* WS "]" {
        return { 
            type: "map", 
            iterable: iterable.join(''), 
            children: elements.map(e => e[0]) 
        };
    }