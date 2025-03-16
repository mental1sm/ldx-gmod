{
  const fs = require('fs');
  const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
  const mappingConfig = JSON.parse(fs.readFileSync('derma-mappings.json', 'utf8'));

  const usedAliases = {};
  let aliasCounter = 1; // Start with 1

  function registerAlias(method, isDot) {
    if (!usedAliases[method]) {
      const aliasIndex = aliasCounter++;
      usedAliases[method] = {
        luaStr: `${config.aliasPrefix}[${aliasIndex}] = function(_, ...) return _${isDot ? '.' : ':'}${method}(...) end\n`,
        alias: aliasIndex
      };
      console.log(`[registerAlias] Created alias for ${method}: ${config.aliasPrefix}[${aliasIndex}]`);
    }
    return usedAliases[method].alias;
  }

  function useVguiCreateAlias() {
    if (!usedAliases['vgui.Create']) {
      const aliasIndex = aliasCounter++;
      usedAliases['vgui.Create'] = {
        luaStr: `${config.aliasPrefix}[${aliasIndex}] = vgui.Create\n`,
        alias: aliasIndex
      };
      console.log(`[useVguiCreateAlias] Created alias for vgui.Create: ${config.aliasPrefix}[${aliasIndex}]`);
    }
    return usedAliases['vgui.Create'].alias;
  }

  const methods = Object.values(mappingConfig.baseMappings).map(m => m.method);
  console.log('[Init] Methods from mappingConfig:', methods);
}

start
  = blocks:(functionDef / forLoop / vguiCreateLine / vguiCreateAssign / methodCallLine / dotMethodCallLine / otherLine)* WS {
    const aliasCode = `local ${config.aliasPrefix} = {}\n` + Object.values(usedAliases).map(al => al.luaStr).join('');
    return aliasCode + blocks.join('');
  }

functionDef
  = "function" WS name:identifier "(" args:argumentString ")" WS lines:(forLoop / vguiCreateLine / vguiCreateAssign / methodCallLine / dotMethodCallLine / otherLine)* "end" WS? {
    return `function ${name}(${args})\n${lines.join('')}end\n`;
  }

forLoop
  = WS "for" WS key:identifier "," WS value:identifier WS "in" WS "pairs(" array:identifier ")" WS "do" WS body:(vguiCreateLine / vguiCreateAssign / methodCallLine / dotMethodCallLine / otherLine)* "end" WS? {
    return `for ${key}, ${value} in pairs(${array}) do\n${body.join('')}end\n`;
  }

vguiCreateLine
  = WS "local" WS varName:varExpression WS "=" WS "vgui.Create" "(" type:quotedString "," WS parent:identifier ")" "\n" {
    const alias = useVguiCreateAlias();
    return `local ${varName} = ${config.aliasPrefix}[${alias}](${type}, ${parent})\n`;
  }

vguiCreateAssign
  = WS varName:varExpression WS "=" WS "vgui.Create" "(" type:quotedString "," WS parent:identifier ")" "\n" {
    const alias = useVguiCreateAlias();
    return `${varName} = ${config.aliasPrefix}[${alias}](${type}, ${parent})\n`;
  }

methodCallLine
  = WS methodCall:classMethodCall "\n" {
    const alias = registerAlias(methodCall.method, false);
    return `${config.aliasPrefix}[${alias}](${methodCall.varName}${methodCall.args.length ? ', ' + methodCall.args : ''})\n`;
  }

dotMethodCallLine
  = WS methodCall:dotMethodCall "\n" {
    const alias = registerAlias(methodCall.method, true);
    return `${config.aliasPrefix}[${alias}](${methodCall.varName}${methodCall.args.length ? ', ' + methodCall.args : ''})\n`;
  }

otherLine
  = WS content:[^\n]* "\n" {
    return content.length ? `${content.join('')}\n` : '\n';
  }

classMethodCall
  = varName:varExpression ":" method:identifier "(" args:argumentString ")" {
    return {
      varName: varName,
      method: method,
      args: args,
      original: `${varName}:${method}(${args})`
    };
  }

dotMethodCall
  = varName:varExpression "." method:identifier "(" args:argumentString ")" {
    return {
      varName: varName,
      method: method,
      args: args,
      original: `${varName}.${method}(${args})`
    };
  }

varExpression
  = base:identifier index:("[" idx:identifier "]")? {
    return index ? `${base}[${index[1]}]` : base;
  }

identifier
  = [a-zA-Z_][a-zA-Z0-9_]* { return text(); }

argumentString
  = args:(methodCallArg / dotMethodCallArg / nestedParens / [^\n(),]+ / "," WS)* {
    return args.map(arg => Array.isArray(arg) ? arg.join('') : arg).join('');
  }

methodCallArg
  = varName:varExpression ":" method:identifier "(" innerArgs:argumentString ")" {
    if (methods.includes(method)) {
      const alias = registerAlias(method, false);
      return `${config.aliasPrefix}[${alias}](${varName}${innerArgs.length ? ', ' + innerArgs : ''})`;
    }
    return `${varName}:${method}(${innerArgs})`;
  }

dotMethodCallArg
  = varName:varExpression "." method:identifier "(" innerArgs:argumentString ")" {
    if (methods.includes(method)) {
      const alias = registerAlias(method, true);
      return `${config.aliasPrefix}[${alias}](${varName}${innerArgs.length ? ', ' + innerArgs : ''})`;
    }
    return `${varName}.${method}(${innerArgs})`;
  }

nestedParens
  = "(" inner:(nestedParens / [^()])* ")" { return "(" + inner.join('') + ")"; }

quotedString
  = "\"" content:[^\"]* "\"" { return `"${content.join('')}"`; }

WS "whitespace" = [ \t\r\n]*