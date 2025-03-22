{   
    const fs = require('fs');
    const util = require('util');
    // === Configuration Loading ===
    const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

}

// File start
start
  = WS nodes:( (externalCodeDef / componentDef) WS )* eof {
        return nodes.map(n => n[0]); 
  }


componentDef
    = externalCode:(externalCode WS)? "Component" WS name:[A-Za-z0-9]+ WS "=" WS "{" WS inlineBefore:inlineCode* WS elements:element WS inlineAfter:inlineCode* WS "}" {
        const tree = {
            component: name.join(''),
            type: 'component',
            elements: [...inlineBefore, elements, ...inlineAfter],
        }

         return tree
    }

externalCodeDef
    = code:externalCode {        
        return { type: 'external', code: code };
    }

externalCode
    = "{" WS content:nestedCurly WS "}" { return content; }

element 
    = "<" tag:tagName subscriptions:subscription* props:prop* WS ">" WS children:(WS (element / inject / inlineCode / ifBlock / mapBlock / useEffectBlock))* WS "</" tagName ">"
    { 
        return { 
            tag: tag,
            type: 'element',
            subscriptions: subscriptions.map(s => s[1]), 
            props: Object.fromEntries(props), 
            children: children.map(c => c[1]) 
        }; 
    }
    / "<" tag:tagName subscriptions:subscription* props:prop* WS "/>"
    { return { tag: tag, type: 'element', props: Object.fromEntries(props), children: [], subscriptions: subscriptions }; }
    / inlineCode
    / ifBlock
    / mapBlock
    / useEffectBlock

subscription
    = WS "@" name:[a-zA-Z0-9.]+ meta:([!&]*)? subscriptionBlock:subscriptionBlock?
    { 
        return { 
            name: name.join(''), 
            onUpdate: subscriptionBlock || null,
            metadata: meta
        };
    }

subscriptionBlock
    = "=[" WS onUpdate:(inlineCode / "") WS "]" 
    { 
        return onUpdate && onUpdate.type === "inline" ? onUpdate : null; 
    }

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
    = WS name:[a-zA-Z]+ "=" value:value { return [name.join(''), {variant: 'default', value: value}]; }
    / WS name:[a-zA-Z]+ "=~" value:value { return [name.join(''), {variant: 'classFunc', value: value}]; }
    / WS name:[a-zA-Z]+ "=:" value:value { return [name.join(''), {variant: 'property', value: value}]; }
    / WS name:[a-zA-Z]+ "=+" value:value { return [name.join(''), {variant: 'func', value: value}]; }
    / WS name:[a-zA-Z]+ { return [name.join(''), null]; }

value
    = "\"" val:[^\"]* "\"" {return val; }
    / "{" val:nestedCurly "}" { return val; }


WS "whitespace" = [ \t\r\n]*

inject
    = "INJECT(" WS name:[A-Za-z]+ WS ")"
    { return { type: "inject", name: name.join(""), arg: "LDX_INPUT_ARGS", code: `${name.join("")}(LDX_INPUT_ARGS, $PARENT)` }; }

ifBlock
    = "IF(" condition:[^)]+ ")" WS "[" WS elements:(element WS)* WS "]" {
        return { 
            type: "if", 
            body: condition.join(''), 
            children: elements.map(e => e[0]),
            
        };
    }

mapBlock
    = "MAP(" iterable:[^)]+ ")" WS "[" WS elements:(element WS)* WS "]" {
        return { 
            type: "map", 
            body: iterable.join(''), 
            children: elements.map(e => e[0]) 
        };
    }

useEffectBlock
    = "USE_EFFECT(" WS body:luaCode WS "," WS deps:dependencyList WS ")" 
    {
        return {
            type: "use_effect",
            body: body,
            dependencies: deps,
        };
    }

luaCode
    = code:$([^,]+)
    {
        return code.trim();
    }

dependencyList
    = "{" WS list:identifierList? WS "}"
    {
        return list || [];
    }

identifierList
    = first:identifier rest:(WS "," WS identifier)* 
    {
        return [first, ...rest.map(r => r[3])];  // `r[3]` — identifier after ','
    }

identifier
    = $([a-zA-Z_][a-zA-Z0-9_]*) 

eof
  = !.