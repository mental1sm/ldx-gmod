{
    
    const baseMappings = {
        width: { method: 'SetSize', pairedWith: ['height']},
        height: { method: 'SetSize', pairedWith: ['width']},
        title: { method: 'SetTitle' },
        text: { method: 'SetText' },
        onClick: { method: 'DoClick'},
    }
    const dermaMappings = {
        DFrame: [baseMappings.width, baseMappings.height, baseMappings.title, baseMappings.text]
        DButton: [baseMappings.width, baseMappings.height, baseMappings.onClick, baseMappings.text]
        DLabel: [baseMappings.width, baseMappings.height, baseMappings.text]
    };
    
    let varCounter = 0;
    function makeElement(tag, props, children, parentName = null) {
        const varName = `elem${varCounter++}`;
        let lua = `local ${varName} = vgui.Create("${tag}"${parentName ? ', ' + parentName : ''})\n`;

        const propsStr = Object.entries(props || {})
        .map(([key, val]) => {
            let processedVal = val;
            if (parentName && typeof val === 'string' && val.includes('PARENT')) {
                processedVal = val.replace(/PARENT/g, parentName);
            };
            
            if (key === 'width' || key === 'height') return ``; // Skip paired to avoid duplicate
            if (key === 'onClick') return `${varName}.DoClick = ${processedVal}\n`;
            if (key === 'text') return `${varName}:SetText(${processedVal})\n`;
            return `${varName}:${key}(${processedVal})\n`;
        })
        .join('');

        if (props.width || props.height) {
            lua += `${varName}:SetSize(${props.width || 0}, ${props.height || 0})\n`;
        }

        lua += propsStr;

        if (children.length) {
            lua += children.map(child => makeElement(child.tag, child.props || [], child.children || [], varName)).join('');
        }
        return lua;
    }
}

start
    = WS elements:element* WS {
            return elements.map(elem => makeElement(elem.tag, elem.props, elem.children)).join('');
        }

element 
    = "<" tag:tagName props:prop* ">" WS children:element* WS "</" tagName ">"
    { return { tag: tag, props: Object.fromEntries(props), children: children }; }
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
