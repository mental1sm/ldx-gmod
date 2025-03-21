function rename(code) {
    return code
      .replaceAll('PARENT', '__p')
      .replaceAll('LDX_INPUT_ARGS', '__LDXIA')
  }

  
module.exports.rename = rename