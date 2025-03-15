const fs = require('fs');
const path = require('path');

async function scanDirectory(dir, callback) {
    const files = await fs.promises.readdir(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = await fs.promises.stat(fullPath);
        if (stat.isDirectory()) {
          await scanDirectory(fullPath, callback);
        } else if (stat.isFile() && path.extname(file) === '.ldx') {
          await callback(fullPath);
        }
      }
}

module.exports.scanDirectory = scanDirectory