{   
    const fs = require('fs');
    // const logger = require('./logger');

    // === Configuration Loading ===
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

    const typePipe = options.typePipe;

}

// File start
start
    = WS components:( (componentDef / externalCodeDef) WS )* {
        return components.map(c => c[0].code).join('\n\n');
    }

componentDef
    = externalCode:(externalCode WS)? "Component" WS name:[A-Za-z]+ WS "=" WS "{" WS inlineBefore:inlineCode? WS elements:element* WS inlineAfter:inlineCode? WS "}" {
        const external = externalCode ? externalCode[0] + "\n\n" : "";
        const inlineBeforeCode = inlineBefore && inlineBefore.code ? inlineBefore.code + '\n' : '';
        const inlineAfterCode = inlineAfter && inlineAfter.code ? inlineAfter.code + '\n' : '';
        const code = `function ${name.join('')}(LDX_INPUT_ARGS, PARENT)\n` + 
                    inlineBeforeCode +
                    elements.map(elem => typePipe.typePipeline(elem).processAll()).join('') + 
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
    = WS "@" name:[a-zA-Z0-9.]+ { return ["@", name.join('')]; }

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
    = "IF(" condition:[^)]+ ")" WS "[" WS elements:(element WS)* WS "]" {
        return { 
            type: "if", 
            condition: condition.join(''), 
            children: elements.map(e => e[0]),
            
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