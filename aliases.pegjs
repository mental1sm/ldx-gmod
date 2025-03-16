{
  const fs = require('fs');
  const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
  const mappingConfig = JSON.parse(fs.readFileSync('derma-mappings.json', 'utf8'));

  const usedAliases = {};
  let aliasCounter = 0;

  function useAlias(method) { // (:)
    if (!usedAliases[method]) {
      const aliasName = config.aliasPrefix + aliasCounter++;
      usedAliases[method] = {
        luaStr: `local ${aliasName} = function(_, ...) return _:${method}(...) end\n`,
        alias: aliasName
      };
      console.log(`[useAlias] Created alias for ${method}: ${aliasName}`);
    }
    return usedAliases[method].alias;
  }

  function useDotAlias(method) { // (.)
    if (!usedAliases[method]) {
      const aliasName = config.aliasPrefix + aliasCounter++;
      usedAliases[method] = {
        luaStr: `local ${aliasName} = function(_, ...) return _.${method}(...) end\n`,
        alias: aliasName
      };
      console.log(`[useDotAlias] Created alias for ${method}: ${aliasName}`);
    }
    return usedAliases[method].alias;
  }

  function useVguiCreateAlias() {
    if (!usedAliases['vgui.Create']) {
      const aliasName = config.aliasPrefix + aliasCounter++;
      usedAliases['vgui.Create'] = {
        luaStr: `local ${aliasName} = vgui.Create\n`,
        alias: aliasName
      };
      console.log(`[useVguiCreateAlias] Created alias for vgui.Create: ${aliasName}`);
    }
    return usedAliases['vgui.Create'].alias;
  }

  const methods = Object.values(mappingConfig.baseMappings).map(m => m.method);
  console.log('[Init] Methods from mappingConfig:', methods);
}

start
  = blocks:(functionDef / vguiCreateLine / methodCallLine / dotMethodCallLine / otherLine)* WS {
    const code = blocks.join('');
    const aliasCode = Object.values(usedAliases).map(al => al.luaStr).join('');
    return aliasCode + code;
  }

functionDef
  = "function" WS name:identifier "(" args:argumentString ")" WS lines:(vguiCreateLine / methodCallLine / dotMethodCallLine / otherLine)* "end" WS? {
    return `function ${name}(${args})\n${lines.join('')}end\n`;
  }

vguiCreateLine
  = WS "local" WS varName:identifier WS "=" WS "vgui.Create" "(" type:quotedString "," WS parent:identifier ")" "\n" {
    const alias = useVguiCreateAlias();
    return `  local ${varName} = ${alias}(${type}, ${parent})\n`;
  }

methodCallLine
  = WS methodCall:classMethodCall "\n" {
    const alias = useAlias(methodCall.method);
    return `  ${alias}(${methodCall.varName}${methodCall.args.length ? ', ' + methodCall.args : ''})\n`;
  }

dotMethodCallLine
  = WS methodCall:dotMethodCall "\n" {
    const alias = useDotAlias(methodCall.method);
    return `  ${alias}(${methodCall.varName}${methodCall.args.length ? ', ' + methodCall.args : ''})\n`;
  }

otherLine
  = WS content:[^\n]* "\n" {
    return content.length ? `  ${content.join('')}\n` : '\n';
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

dotMethodCall
  = varName:identifier "." method:identifier "(" args:argumentString ")" {
    return {
      varName: varName,
      method: method,
      args: args,
      original: `${varName}.${method}(${args})`
    };
  }

identifier
  = [a-zA-Z_][a-zA-Z0-9_]* { return text(); }

argumentString
  = args:(methodCallArg / dotMethodCallArg / nestedParens / [^\n(),]+ / "," WS)* {
    return args.map(arg => Array.isArray(arg) ? arg.join('') : arg).join('');
  }

methodCallArg
  = varName:identifier ":" method:identifier "(" innerArgs:argumentString ")" {
    if (methods.includes(method)) {
      const alias = useAlias(method);
      return `${alias}(${varName}${innerArgs.length ? ', ' + innerArgs : ''})`;
    }
    return `${varName}:${method}(${innerArgs})`;
  }

dotMethodCallArg
  = varName:identifier "." method:identifier "(" innerArgs:argumentString ")" {
    if (methods.includes(method)) {
      const alias = useDotAlias(method);
      return `${alias}(${varName}${innerArgs.length ? ', ' + innerArgs : ''})`;
    }
    return `${varName}.${method}(${innerArgs})`;
  }

nestedParens
  = "(" inner:(nestedParens / [^()])* ")" { return "(" + inner.join('') + ")"; }

quotedString
  = "\"" content:[^\"]* "\"" { return `"${content.join('')}"`; }

WS "whitespace" = [ \t\r\n]*