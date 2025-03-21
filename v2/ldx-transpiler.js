const fs = require('fs');
const path = require('path');
const peggy = require('peggy');
const logger = require('./util/logger')
const scanner = require('./util/scanner')

// ----------------------------------------------------------------------
// Preprocessing
const preprocessor = require('./preprocessing/preprocessor')
const grammar = fs.readFileSync('./preprocessing/ldx.pegjs', 'utf8')

// Codegen
const codegen = require('./codegen/codegen')

// Postprocessing
const identMasterGrammar = fs.readFileSync('./postprocessing/ident.pegjs', 'utf8')
// ----------------------------------------------------------------------

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const parser = peggy.generate(grammar)
const identMaster = peggy.generate(identMasterGrammar)



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
        const preparedTree = preprocessor.preprocessingPipeline(result)
        const generatedCode = codegen.generateCode(preparedTree)
        const prettifiedCode = identMaster.parse(generatedCode)

        await fs.promises.writeFile(outputFile, prettifiedCode);
        logger.info(`Generated ${outputFile}`);
    } 
    catch (e) {
        logger.warn(`Failed to parse ${inputFile}: ${e}`);
        console.log(e)
    }
}

(async () => {
    if (fs.existsSync(config.outputDirectory)) {
        await fs.promises.rm(config.outputDirectory, { recursive: true });
        logger.info(`Cleaned ${config.outputDirectory}`);
      }
      await scanner.scanDirectory(config.sourceDirectory, parseLDX, '.ldx');
  })();