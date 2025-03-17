const fs = require('fs');
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const mappingConfig = JSON.parse(fs.readFileSync('derma-mappings.json', 'utf8'));

const baseMappings = Object.fromEntries(
    Object.entries(mappingConfig.baseMappings).map(([key, val]) => [
        key,
        { ...val, mapType: types[val.mapType] },
    ])
);

const dermaMappings = Object.fromEntries(
    Object.entries(mappingConfig.dermaMappings).map(([tag, propNames]) => [
        tag,
        Object.fromEntries(propNames.map(name => [name, baseMappings[name]])),
    ])
);

function getInheritedAttributes(tag, mappings) {
    const result = new Set();
    
    function collectDermaAttributes(currentTag) {
        if (!currentTag || !mappings.inheritance[currentTag]) return;

        if (mappings.dermaMappings[currentTag]) {
            mappings.dermaMappings[currentTag].forEach(attr => result.add(attr));
        }

        const parents = mappings.inheritance[currentTag];
        if (parents) {
            parents.forEach(parent => collectDermaAttributes(parent));
        }
    }
    
    collectDermaAttributes(tag);
    return Array.from(result);
}

module.exports.getInheritedAttributes = getInheritedAttributes
module.exports.baseMappings = baseMappings
module.exports.dermaMappings = dermaMappings