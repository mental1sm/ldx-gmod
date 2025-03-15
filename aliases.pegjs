{
  const fs = require('fs');
  const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
  const mappingConfig = JSON.parse(fs.readFileSync('derma-mappings.json', 'utf8'));

  const usedAliases = {};
  let aliasCounter = 0;

  function useAlias(method) {
    if (!usedAliases[method]) {
      const aliasName = config.aliasPrefix + aliasCounter++;
      usedAliases[method] = {
        luaStr: `local ${aliasName} = function(_, ...) return _:${method}(...) end\n`,
        alias: aliasName
      };
      console.log(`Created alias for ${method}: ${aliasName}`);
    }
    return usedAliases[method].alias;
  }

  const methods = Object.values(mappingConfig.baseMappings).map(m => m.method);
}

start
  = blocks:(functionDef / line)* {
    const code = blocks.join('');
    const aliasCode = Object.values(usedAliases).map(al => al.luaStr).join('');
    return aliasCode + code;
  }

functionDef
  = "function" WS name:identifier "(" args:argumentString ")" WS body:functionBody "end" WS {
    return `function ${name}(${args})\n${body}end\n`;
  }

functionBody
  = lines:(methodCallLine / otherLine)* {
    return lines.join('');
  }

methodCallLine
  = WS methodCall:classMethodCall "\n" {
    if (methods.includes(methodCall.method)) {
      const alias = useAlias(methodCall.method);
      return `  ${alias}(${methodCall.varName}, ${methodCall.args})\n`;
    }
    return `  ${methodCall.original}\n`;
  }

otherLine
  = WS content:[^\n]* "\n" {
    return content.length ? `  ${content.join('')}\n` : '\n';
  }

line
  = content:[^\n]* "\n" {
    return content.join('') + '\n';
  }

classMethodCall
  = varName:identifier ":" method:identifier "(" args:argumentString ")" {
    return {
      varName: varName,
      method: method,
      args: args,
      original: `${varName}:${method}(${args})`
    };
  }

identifier
  = [a-zA-Z_][a-zA-Z0-9_]* { return text(); }

argumentString
  = chars:(nestedParens / [^()])* { return chars.join(''); }

nestedParens
  = "(" inner:(nestedParens / [^()])* ")" { return "(" + inner.join('') + ")"; }

WS "whitespace" = [ \t\r\n]*