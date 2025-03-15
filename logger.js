const fs = require('fs')

const config = JSON.parse(fs.readFileSync('config.json'))

function info(msg) {
    if (config.logLevel === "INFO" || config.logLevel === "WARN" || config.logLevel === "DEBUG") console.log(`[LDX] ${msg}`)
}
function warn(msg) {
    if (config.logLevel === "WARN" || config.logLevel === "DEBUG") console.log(`[LDX] ${msg}`)
}
function debug(msg) {
    if (config.logLevel === "DEBUG") console.log(`[LDX] ${msg}`)
}

const logger = {
    info: info,
    warn: warn,
    debug: debug
}

module.exports = logger