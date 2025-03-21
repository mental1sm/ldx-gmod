const fs = require('fs');
const path = require('path');

async function scanDirectory(dir, callback, ext) {
    const files = await fs.promises.readdir(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = await fs.promises.stat(fullPath);
        if (stat.isDirectory()) {
          await scanDirectory(fullPath, callback, ext);
        } else if (stat.isFile() && path.extname(file) === ext) {
          await callback(fullPath);
        }
      }
}

async function scanDirectoryRevert(dir, callback, ext) {
  const files = await fs.promises.readdir(dir);
  for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = await fs.promises.stat(fullPath);
      if (stat.isDirectory()) {
        await scanDirectoryRevert(fullPath, callback, ext);
      } else if (stat.isFile() && path.extname(file) !== ext) {
        await callback(fullPath);
      }
    }
}

module.exports.scanDirectory = scanDirectory
module.exports.scanDirectoryRevert = scanDirectoryRevert