const fs = require('fs');
const path = require('path');
const peggy = require('peggy');
const logger = require('./util/logger')
const scanner = require('./util/scanner')
const minify = require('./util/minify')
const renamer = require('./util/renamer')

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
            result = aliasParser.parse(result + '\n');
        }
        if (config.minify) {
            result = minify.minifyLua(result);
        }
        if (config.rename) {
            result = renamer.rename(result);
        }
        await fs.promises.writeFile(outputFile, result);
        logger.info(`Generated ${outputFile}`);
    } 
    catch (e) {
        logger.warn(`Failed to parse ${inputFile}: ${e}`);
        console.log(e)
    }
}

async function transferOther(inputFile) {
    const relativePath = path.relative(config.sourceDirectory, inputFile);
    const outputFile = path.join(config.outputDirectory, relativePath);
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
        await fs.promises.mkdir(outputDir, { recursive: true });
    }
    await fs.promises.copyFile(inputFile, outputFile);
    logger.info(`Copied ${outputFile}`);
}

(async () => {
    if (fs.existsSync(config.outputDirectory)) {
        await fs.promises.rm(config.outputDirectory, { recursive: true });
        logger.info(`Cleaned ${config.outputDirectory}`);
      }
      await scanner.scanDirectoryRevert(config.sourceDirectory, transferOther, '.ldx');  
      await scanner.scanDirectory(config.sourceDirectory, parseLDX, '.ldx');
  })();