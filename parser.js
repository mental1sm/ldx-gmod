const fs = require('fs');
const path = require('path');
const peggy = require('peggy');
const logger = require('./logger')
const scanner = require('./scanner')
const minify = require('./minify')

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const grammar = fs.readFileSync('ldx.pegjs', 'utf8')
const luaGrammar = fs.readFileSync('aliases.pegjs', 'utf8')
const parser = peggy.generate(grammar)
const aliasParser = peggy.generate(luaGrammar)


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
        let result;
        result = parser.parse(ldxContent);
        if (config.generateAlias) {
            result = aliasParser.parse(result);
        }
        if (config.minify) {
            result = minify.minifyLua(result);
        }
        await fs.promises.writeFile(outputFile, result);
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
    await scanner.scanDirectory(config.sourceDirectory, parseLDX);
  })();