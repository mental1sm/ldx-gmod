const fs = require('fs');
const config = JSON.parse(fs.readFileSync('../config.json', 'utf8'));
const mappingConfig = JSON.parse(fs.readFileSync('../derma-mappings.json', 'utf8'));

// === Lua Generation Types ===
const types = {
    func: (varName, method, value) => `${varName}.${method}(${value || ''})\n`,
    classFunc: (varName, method, value) => `${varName}:${method}(${value || ''})\n`,
    property: (varName, method, value) => `${varName}.${method} = ${value ? value.replace(/^\s+|\s+$/g, '') : 'function() end'}\n`, // trim spaces at the start & end of value
};

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

const getMappings = (tag) => {
    // Array of inherited atts ['...', '...']
    const inheritedAttrs = getInheritedAttributes(tag, mappingConfig);
    // {attr: { method: '...', mapType: [Function: ...] }
    return Object.fromEntries(inheritedAttrs.map(attr => [attr, baseMappings[attr]]))
}

const generateProps = (varName, tag, props) => {
    const mappings = getMappings(tag)
    return Object.entries(props).map(([propName, propContent]) => {
        const propMapping = mappings[propName]
        !propContent.variant || propContent.variant === 'default' ? {} : propMapping.mapType = types[propContent.variant]
        return propMapping.mapType(varName, propMapping.method, propContent.value)
    })
}

module.exports.getInheritedAttributes = getInheritedAttributes
module.exports.baseMappings = baseMappings
module.exports.dermaMappings = dermaMappings
module.exports.propMappers = types
module.exports.getMappings = getMappings
module.exports.generateProps = generateProps