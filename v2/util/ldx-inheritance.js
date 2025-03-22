const fs = require('fs');

// ==== CONFIG PARSING ====
const config = JSON.parse(fs.readFileSync('../config.json', 'utf8'));
const mappingData = JSON.parse(fs.readFileSync('../derma-mappings.json', 'utf8'));

// ==== MAPPING STRATEGIES ====
const mappingStrategies = {
    func: (varName, method, value) => `${varName}.${method}(${value || ''})`,
    classFunc: (varName, method, value) => `${varName}:${method}(${value || ''})`,
    property: (varName, method, value) => {
        const trimmed = value ? value.trim() : 'function() end';
        return `${varName}.${method} = ${trimmed}`;
    }
};

// ==== BASE PROP MAPPINGS ====
const basePropMappings = Object.fromEntries(
    Object.entries(mappingData.baseMappings).map(([propName, def]) => [
        propName,
        { ...def, mapType: mappingStrategies[def.mapType] }
    ])
);

// ==== DERMA-TYPE TO PROP MAP ====
const dermaPropMappings = Object.fromEntries(
    Object.entries(mappingData.dermaMappings).map(([tag, propNames]) => [
        tag,
        Object.fromEntries(
            propNames.map(name => [name, basePropMappings[name]])
        )
    ])
);

// ==== INHERITANCE RESOLUTION ====
function getInheritedPropNames(dermaTag) {
    const collected = new Set();

    function collect(tag) {
        if (!tag || !mappingData.inheritance[tag]) return;

        if (mappingData.dermaMappings[tag]) {
            mappingData.dermaMappings[tag].forEach(attr => collected.add(attr));
        }

        const parents = mappingData.inheritance[tag];
        if (parents) {
            parents.forEach(collect);
        }
    }

    collect(dermaTag);
    return Array.from(collected);
}

// ==== MAPPING RESOLVER FOR A TAG ====
function getPropMappingsForTag(tag) {
    const inheritedProps = getInheritedPropNames(tag);
    return Object.fromEntries(
        inheritedProps.map(propName => [propName, basePropMappings[propName]])
    );
}

// ==== PROP GENERATOR ====
function generateProps(varName, tag, props) {
    const mappings = getPropMappingsForTag(tag);

    return Object.entries(props).map(([propName, propData]) => {
        const mapping = mappings[propName];
        if (!mapping) return '';

        const strategy = propData.variant && propData.variant !== 'default'
            ? mappingStrategies[propData.variant]
            : mapping.mapType;

        return strategy(varName, mapping.method, propData.value);
    }).filter(Boolean); // remove empty
}

// ==== EXPORTS ====
module.exports = {
    getInheritedPropNames,
    getPropMappingsForTag,
    generateProps,
    basePropMappings,
    dermaPropMappings,
    mappingStrategies
};
