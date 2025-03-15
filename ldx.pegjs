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
    
    // Vars unique name generator
    let varCounter = 0;
    function makeElement(tag, props, children, parentName = null) {
        // If has id, than name will be id, else generated
        let varName;
        if (props.id && typeof(props.id) === 'string') {
            varName = props.id.replaceAll('\"', '');
            identifiedComponents[varName] = props;
        }
        else varName = `${config.varPrefix}${varCounter++}`;

        //logger.debug(`Generating ${varName} with tag ${tag} and parent ${parentName}`)
        let lua = `local ${varName} = vgui.Create("${tag}"${parentName ? ', ' + parentName : ', PARENT'})\n`;

        const mappings = dermaMappings[tag] || {};
        //logger.debug('Detected mappings:\n' + mappings.toString())

        let propsStr = '';

        // Processing props
        Object.entries(props || {}).forEach(([key, val]) => {
            const mapping = mappings[key];
            if (!mapping) return; // Prop does not supported in this component, so ignore it

            let processedVal = val;
            if (parentName && typeof val === 'string' && val.includes('$PARENT')) {
                processedVal = val.replace(/\$PARENT/g, parentName ? parentName : '');
            }
            else if (val.includes('$PARENT')) processedVal = val.replace(/\$PARENT/g, 'PARENT');

            propsStr += mapping.mapType(varName, mapping.method, processedVal);            
        });

        lua += propsStr;

        if (children.length) {
            lua += children.map(child => {
                if (child.type === "inject") {

                    return `${child.name}(${child.arg}, ${varName})\n`;
                }
                return makeElement(child.tag, child.props || [], child.children || [], varName)
                }
                ).join('');
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
                    elements.map(elem => makeElement(elem.tag, elem.props, elem.children)).join('') + 
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
    = "<" tag:tagName props:prop* ">" WS children:(WS (element / inject))* WS "</" tagName ">"
    { 
        return { 
            tag: tag, 
            props: Object.fromEntries(props), 
            children: children.map(c => c[1]) 
        }; 
    }
    / "<" tag:tagName props:prop* WS "/>"
    { return { tag: tag, props: Object.fromEntries(props), children: [] }; }

tagName
    = [A-Za-z]+ { return text(); }

prop 
    = WS name:[a-zA-Z]+ "=" value:value { return [name.join(''), value]; }

value
    = "\"" val:[^\"]* "\"" { return val.join(''); }
    / "{" val:[^}]* "}" { return val.join(''); }

WS "whitespace" = [ \t\r\n]*


inject
    = "INJECT(" WS name:[A-Za-z]+ WS ")"
    { return { type: "inject", name: name.join(""), arg: "LDX_INPUT_ARGS" }; }