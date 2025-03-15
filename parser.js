const fs = require('fs');
const path = require('path');
const peggy = require('peggy');
const logger = require('./logger')

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

const grammar = fs.readFileSync('ldx.pegjs', 'utf8')
const parser = peggy.generate(grammar)

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

async function parseLDX(inputFile) {
    logger.debug(`Reading ${inputFile}`);
  const relativePath = path.relative(config.sourceDirectory, inputFile);
  const outputFile = path.join(config.outputDirectory, relativePath).replace('.ldx', '.lua');

  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    await fs.promises.mkdir(outputDir, { recursive: true });
  }

  try {
    const ldxContent = await fs.promises.readFile(inputFile, 'utf8');
    const luaCode = parser.parse(ldxContent);
    await fs.promises.writeFile(outputFile, luaCode);
    logger.info(`Generated ${outputFile}`);
  } 
  catch (e) {
    logger.warn(`Failed to parse ${inputFile}: ${e.message}`);
  }
}

(async () => {
    if (fs.existsSync(config.outputDirectory)) {
        await fs.promises.rm(config.outputDirectory, { recursive: true });
        logger.info(`Cleaned ${config.outputDirectory}`);
      }
    await scanDirectory(config.sourceDirectory, parseLDX);
  })();