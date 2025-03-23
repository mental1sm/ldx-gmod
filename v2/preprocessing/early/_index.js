const INIT_CONTEXT = require('./init-context')
const DEFINE_PARENT = require('./define-parent')
const DEFINE_VARNAME = require('./define-varname')
const DEFINE_ROOT = require('./define-root')
const HANDLE_NOLOCAL = require('./handle-nolocal')
const ANALYZE_CONTEXT = require('./analyze-context')
const EXECUTOR = require('.')

module.exports = {
    INIT_CONTEXT: INIT_CONTEXT.initContext,
    INIT_CONTEXT_MODULE: INIT_CONTEXT,
    DEFINE_PARENT: DEFINE_PARENT.defineParent,
    DEFINE_VARNAME: DEFINE_VARNAME.defineVarName,
    DEFINE_ROOT: DEFINE_ROOT.defineRootElement,
    HANDLE_NOLOCAL: HANDLE_NOLOCAL.handleNoLocal,
    ANALYZE_CONTEXT: ANALYZE_CONTEXT.analyzeContext,
    EXECUTOR: EXECUTOR.executeEarlyStage
}