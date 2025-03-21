function replaceParentAlias(value, parentName) {
    let processedValue = value;
    if (!value) return;
    if (parentName && value.includes('$PARENT')) {
        processedValue = value.replace(/\$PARENT/g, parentName || '');
    } 
    else if (value.includes('$PARENT')) {
        processedValue = value.replace(/\$PARENT/g, 'PARENT');
    }
    return processedValue;
}

module.exports.replaceParentAlias = replaceParentAlias