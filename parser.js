const fs = require('fs');
const peggy = require('peggy');

const grammar = fs.readFileSync('ldx.pegjs', 'utf8')
const parser = peggy.generate(grammar)

function parseLDX(inputFile, outputFile) {
    const ldxContent = fs.readFileSync(inputFile, 'utf8')
    const luaCode = parser.parse(ldxContent)
    fs.writeFileSync(outputFile, luaCode)
    console.log(`Generated ${outputFile}`)
}

parseLDX('example.ldx', 'example.lua')