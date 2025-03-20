const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const PARENT_ALIAS = '$PARENT'

function replaceParent(string) {
    
}

function processNode(node) {
    if (node.type === 'inline') {
        node.rep
    }
}