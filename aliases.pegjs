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
        luaStr: `local ${aliasName} = function(_o, ...) return _o:${method}(...) end\n`,
        alias: aliasName
      };
      console.log(`Created alias for ${method}: ${aliasName}`);
    }
    return usedAliases[method].alias;
  }

  const methods = Object.values(mappingConfig.baseMappings).map(m => m.method);
}

start
  = lines:line* {
    const code = lines.join('');
    const aliasCode = Object.values(usedAliases).map(al => al.luaStr).join('');
    return aliasCode + code;
  }

line
  = methodCall:classMethodCall "\n" {
    if (methods.includes(methodCall.method)) {
      const alias = useAlias(methodCall.method);
      return `${alias}(${methodCall.varName}, ${methodCall.args})\n`;
    }
    return methodCall.original + '\n';
  }
  / content:[^\n]* "\n" {
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

quote
  = "\""

argumentString
  = chars:(nestedParens / [^()])* { return chars.join(''); }

// Nested '()'
nestedParens
  = "(" inner:(nestedParens / [^()])* ")" { return "(" + inner.join('') + ")"; }

value
  = chars:[^\n]+ { return chars.join(''); }

WS "whitespace" = [ \t]*