const fs = require('fs');
const mappingInheritanceMaster = require('../util/ldx-inheritance')
const snippetGenerator = require('../codegen/snippet-generator')

const INPUT_ARGS = 'LDX_INPUT_ARGS'
const PARENT = 'PARENT'

// ----------------------------------------------------------------------------------------------------------------


function generateComponent(component) {
    const generatedBody = component.elements.map(element => recursiveGenerator(element)).join('')
    const template = `
    function ${component.component}(${INPUT_ARGS}, ${PARENT})
        ${generatedBody}
    end
    `
    return template
}

function generateElement(element) {
    let code = `local ${element.varName} = vgui.Create("${element.tag}", ${element.parent})\n`
    code += mappingInheritanceMaster.generateProps(element.varName, element.tag, element.commonProps).join('')
    code += element.children.map(child => recursiveGenerator(child)).join('')
    return code
}

function recursiveGenerator(node) {
    let code = ''
    if (node.type === 'component') {
        code += generateComponent(node)
    }
    if (node.type === 'external') {
        code += node.code
    }
    if (node.type === 'element') {
        code += generateElement(node)
    }
    if (node.type === 'inline') {
        code += node.code + '\n'
    }
    if (node.type === 'snippet') {
        code += snippetGenerator.generateSnippet(node)
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