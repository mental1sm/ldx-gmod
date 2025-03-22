const fs = require('fs');
const config = JSON.parse(fs.readFileSync('../config.json', 'utf8'));
const mappingInheritanceMaster = require('../util/ldx-inheritance')
const snippetGenerator = require('../codegen/snippet-generator')

const INPUT_ARGS = 'LDX_INPUT_ARGS'
const PARENT = 'PARENT'

// ----------------------------------------------------------------------------------------------------------------


function generateComponent(component) {
    const generatedBody = component.elements.map(element => recursiveGenerator(element)).join('')
    const template = `function ${component.component}(${INPUT_ARGS}, ${PARENT})
        ${generatedBody}
    end`
    return template
}

function generateElement(element) {
    let code = `${element.context.isLocal ? 'local' : ''} ${element.varName} = vgui.Create("${element.tag}", ${element.parent})\n`
    code += mappingInheritanceMaster.generateProps(element.varName, element.tag, element.commonProps).join('\n')
    code += '\n'
    code += element.children.map(child => recursiveGenerator(child)).join('')
    return code
}

function generateMap(map) {
    const template = `for ${config.indexVar}, ${config.itemVar} in pairs(${map.body}) do
        ${map.children.map(child => recursiveGenerator(child)).join('')}
    end`
    return template
}

function generateIf(_if) {
    const template = `if ${_if.body} then
        ${_if.children.map(child => recursiveGenerator(child)).join('')}
    end`
    return template
}

function generateInject(inject) {
    const template = `${inject.code}\n`
    return template
}

function recursiveGenerator(node) {
    let code = ''
    if (node.type === 'component') {
        code += generateComponent(node) + '\n\n'
    }
    if (node.type === 'external') {
        code += node.code + '\n'
    }
    if (node.type === 'element') {
        code += generateElement(node)
    }
    if (node.type === 'inline') {
        code += node.code + '\n'
    }
    if (node.type === 'map') {
        code += generateMap(node) + '\n'
    }
    if (node.type === 'snippet') {
        code += snippetGenerator.generateSnippet(node)
    }
    if (node.type === 'if') {
        code += generateIf(node) + '\n'
    }
    if (node.type === 'inject') {
        code += generateInject(node)
    }
    return code
}

function generateCode(tree) {
    let code = ''
    tree.forEach(rootNode => {
        code += recursiveGenerator(rootNode)
    });

    return code
}

module.exports.generateCode = generateCode